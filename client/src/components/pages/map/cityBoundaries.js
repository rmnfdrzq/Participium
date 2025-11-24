import * as turf from "@turf/turf";
import { useQuery } from "@tanstack/react-query";

/**
 * Create mask polygon (expanded area minus city) for gray overlay outside city
 * @param {Object} cityGeoJSON - City boundaries as GeoJSON
 * @returns {Object|null} Mask polygon as GeoJSON or null if error
 */
export const createMaskPolygon = (cityGeoJSON) => {
  if (!cityGeoJSON) {
    return null;
  }

  try {
    // Convert city GeoJSON to turf Feature
    let cityFeature = turf.feature(cityGeoJSON);

    // Clean and normalize the geometry first
    try {
      // Clean coordinates (remove duplicates, etc.)
      cityFeature = turf.cleanCoords(cityFeature);
      // Normalize winding order
      cityFeature = turf.rewind(cityFeature, { reverse: false });
    } catch (cleanError) {
      // Could not clean coordinates, continuing anyway
    }

    // If MultiPolygon, convert to single Polygon by union
    if (cityFeature.geometry.type === "MultiPolygon") {
      const polygons = cityFeature.geometry.coordinates.map((coords) =>
        turf.polygon(coords[0])
      );
      cityFeature = polygons[0];
      for (let i = 1; i < polygons.length; i++) {
        try {
          const unionResult = turf.union(cityFeature, polygons[i]);
          if (unionResult) {
            cityFeature = unionResult;
          } else {
            // Failed to union polygon, skipping
          }
        } catch (unionError) {
          // Error unioning polygon, skipping
        }
      }
    }

    // Normalize city polygon (counter-clockwise outer ring)
    cityFeature = turf.rewind(cityFeature, { reverse: false });

    // Get bounding box of the city
    const bbox = turf.bbox(cityFeature);
    if (!bbox || bbox.length !== 4) {
      throw new Error("Invalid bounding box");
    }

    // Create a bounding box that covers the entire world
    // This ensures the mask always covers the full visible area at any zoom level
    // World bounds: -180 to 180 longitude, -90 to 90 latitude
    const expandedBbox = [
      -180, // West bound (entire world)
      -90, // South bound (entire world)
      180, // East bound (entire world)
      90, // North bound (entire world)
    ];

    // Create expanded rectangle polygon
    const expandedPolygon = turf.bboxPolygon(expandedBbox);
    if (!expandedPolygon) {
      throw new Error("Failed to create expanded polygon");
    }

    const normalizedExpanded = turf.rewind(expandedPolygon, {
      reverse: false,
    });

    // Create polygon with hole manually (more reliable than turf.difference)
    // Outer ring (expanded bounds) - counter-clockwise
    const outerRing = normalizedExpanded.geometry.coordinates[0];

    // Get city rings - they should be clockwise for holes
    let cityRings = [];
    if (cityFeature.geometry.type === "Polygon") {
      cityRings = cityFeature.geometry.coordinates.map((ring, index) => {
        // First ring is outer, others are holes - but we want all as holes in our mask
        // Ensure ring is clockwise (for hole) - reverse if needed
        const ringPolygon = turf.polygon([ring]);
        // Check winding order - if counter-clockwise, reverse it
        const area = turf.area(ringPolygon);
        let clockwiseRing;
        if (area > 0) {
          // Counter-clockwise, reverse to clockwise
          clockwiseRing = turf.rewind(ringPolygon, { reverse: true });
        } else {
          // Already clockwise
          clockwiseRing = ringPolygon;
        }
        return clockwiseRing.geometry.coordinates[0];
      });
    } else if (cityFeature.geometry.type === "MultiPolygon") {
      // Flatten MultiPolygon to single polygon rings
      cityRings = cityFeature.geometry.coordinates.flat().map((ring) => {
        const ringPolygon = turf.polygon([ring]);
        const area = turf.area(ringPolygon);
        let clockwiseRing;
        if (area > 0) {
          clockwiseRing = turf.rewind(ringPolygon, { reverse: true });
        } else {
          clockwiseRing = ringPolygon;
        }
        return clockwiseRing.geometry.coordinates[0];
      });
    }

    // Ensure outer ring is counter-clockwise
    const outerRingPolygon = turf.polygon([outerRing]);
    const outerArea = turf.area(outerRingPolygon);
    let finalOuterRing = outerRing;
    if (outerArea < 0) {
      // Clockwise, reverse to counter-clockwise
      finalOuterRing = turf.rewind(outerRingPolygon, { reverse: true }).geometry
        .coordinates[0];
    }

    // Create polygon with outer ring and city as inner rings (holes)
    const maskGeoJSON = {
      type: "Polygon",
      coordinates: [finalOuterRing, ...cityRings],
    };

    // Clean and validate the polygon
    try {
      const maskFeature = turf.feature(maskGeoJSON);
      // Clean coordinates to remove duplicates
      const cleaned = turf.cleanCoords(maskFeature);
      // Ensure proper winding: outer counter-clockwise, inner clockwise
      const validated = turf.rewind(cleaned, { reverse: false });
      return validated.geometry;
    } catch (validationError) {
      // Could not validate mask, using as-is
      // Use the polygon anyway - Leaflet can handle it
      return maskGeoJSON;
    }
  } catch (error) {
    // Error creating mask
    return null;
  }
};

/**
 * Load city boundaries from Overpass API
 * @returns {Promise<Object>} Object with cityBoundaries, cityBounds, and maskPolygon
 */
export const loadCityBoundaries = async () => {
  try {
    // Query to find Turin municipality (commune) boundary
    // Using admin_level=8 for Italian municipalities
    // Simplified query with shorter timeout for faster response
    const overpassQuery = `
      [out:json][timeout:15];
      relation["name"="Torino"]["admin_level"="8"]["boundary"="administrative"];
      (._;>;);
      out geom;
    `;

    // Try multiple Overpass API servers (fastest first)
    const overpassServers = [
      "https://overpass.kumi.systems/api/interpreter", // Usually faster
      "https://lz4.overpass-api.de/api/interpreter", // Fast alternative
      "https://overpass-api.de/api/interpreter", // Main server (slower but reliable)
    ];

    let overpassData = null;
    let lastError = null;

    for (const serverUrl of overpassServers) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout (reduced from 30)

        const overpassResponse = await fetch(serverUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check if response is OK
        if (!overpassResponse.ok) {
          if (overpassResponse.status === 504) {
            lastError = new Error("Gateway Timeout");
            continue;
          }
          throw new Error(`HTTP error! status: ${overpassResponse.status}`);
        }

        // Check content type
        const contentType = overpassResponse.headers.get("content-type");
        if (contentType && !contentType.includes("application/json")) {
          lastError = new Error("Invalid content type");
          continue;
        }

        // Parse JSON
        const text = await overpassResponse.text();

        // Check if response is XML (error case)
        if (text.trim().startsWith("<?xml") || text.trim().startsWith("<")) {
          lastError = new Error("Received XML instead of JSON");
          continue;
        }

        overpassData = JSON.parse(text);

        // Check if response has error
        if (overpassData.error) {
          lastError = new Error(overpassData.error);
          continue;
        }

        // Success - break out of loop
        break;
      } catch (error) {
        // Handle abort/timeout errors
        if (error.name === "AbortError") {
          lastError = new Error("Request timeout");
        } else {
          lastError = error;
        }
        continue;
      }
    }

    // If all servers failed
    if (!overpassData) {
      throw lastError || new Error("All Overpass API servers failed");
    }

    if (
      !overpassData ||
      !overpassData.elements ||
      overpassData.elements.length === 0
    ) {
      throw new Error("No data received from Overpass API");
    }

    // Find the relation (should be first result)
    const relation = overpassData.elements.find((el) => el.type === "relation");

    if (!relation) {
      throw new Error("No relation found in Overpass response");
    }

    // Get bounding box from relation
    let cityBounds = null;
    if (relation.bounds) {
      cityBounds = [
        [relation.bounds.minlat, relation.bounds.minlon], // Southwest corner
        [relation.bounds.maxlat, relation.bounds.maxlon], // Northeast corner
      ];
    }

    // Build ways map for quick lookup
    const waysMap = new Map();
    overpassData.elements.forEach((el) => {
      if (el.type === "way" && el.geometry) {
        waysMap.set(el.id, el.geometry);
      }
    });

    // Collect all outer ways and combine them into polygon
    const outerWays = relation.members.filter(
      (m) => m.role === "outer" && m.type === "way"
    );

    if (outerWays.length === 0) {
      throw new Error("No outer ways found in relation");
    }

    // Build way segments with their coordinates
    const waySegments = [];
    for (const member of outerWays) {
      const wayGeometry = waysMap.get(member.ref);
      if (wayGeometry) {
        const wayCoords = wayGeometry.map((point) => [point.lon, point.lat]);
        waySegments.push({
          id: member.ref,
          coords: wayCoords,
          start: wayCoords[0],
          end: wayCoords[wayCoords.length - 1],
        });
      }
    }

    if (waySegments.length === 0) {
      throw new Error("No coordinates found in ways");
    }

    // Connect way segments in order to form a closed polygon
    const allCoordinates = [];
    let currentSegment = waySegments[0];
    const usedSegments = new Set([currentSegment.id]);

    // Start with first segment
    allCoordinates.push(...currentSegment.coords);

    // Connect remaining segments
    while (usedSegments.size < waySegments.length) {
      const lastPoint = allCoordinates[allCoordinates.length - 1];
      let foundNext = false;

      for (const segment of waySegments) {
        if (usedSegments.has(segment.id)) continue;

        // Check if segment connects to last point
        const tolerance = 0.0001; // Small tolerance for floating point comparison
        const connectsStart =
          Math.abs(segment.start[0] - lastPoint[0]) < tolerance &&
          Math.abs(segment.start[1] - lastPoint[1]) < tolerance;
        const connectsEnd =
          Math.abs(segment.end[0] - lastPoint[0]) < tolerance &&
          Math.abs(segment.end[1] - lastPoint[1]) < tolerance;

        if (connectsStart) {
          // Add segment as-is
          allCoordinates.push(...segment.coords.slice(1)); // Skip first point (already added)
          usedSegments.add(segment.id);
          foundNext = true;
          break;
        } else if (connectsEnd) {
          // Add segment reversed
          allCoordinates.push(...segment.coords.slice(0, -1).reverse()); // Skip last point, reverse
          usedSegments.add(segment.id);
          foundNext = true;
          break;
        }
      }

      if (!foundNext) {
        // Could not connect all way segments, using what we have
        break;
      }
    }

    // Close the polygon if needed
    if (
      allCoordinates.length > 0 &&
      (allCoordinates[0][0] !== allCoordinates[allCoordinates.length - 1][0] ||
        allCoordinates[0][1] !== allCoordinates[allCoordinates.length - 1][1])
    ) {
      allCoordinates.push(allCoordinates[0]);
    }

    // Use turf to clean and normalize the polygon
    let geoJSON = {
      type: "Polygon",
      coordinates: [allCoordinates],
    };

    try {
      // Clean and normalize the polygon
      const cleaned = turf.cleanCoords(turf.feature(geoJSON));
      const normalized = turf.rewind(cleaned, { reverse: false });
      geoJSON = normalized.geometry;
    } catch (cleanError) {
      // Could not clean polygon, using as-is
    }

    // Create mask polygon
    const maskPolygon = createMaskPolygon(geoJSON);

    return {
      cityBoundaries: geoJSON,
      cityBounds: cityBounds || [
        [45.0, 7.5],
        [45.15, 7.8],
      ],
      maskPolygon: maskPolygon,
    };
  } catch (error) {
    // Error loading city boundaries
    // Return fallback values
    return {
      cityBoundaries: null,
      cityBounds: [
        [45.0, 7.5],
        [45.15, 7.8],
      ],
      maskPolygon: null,
    };
  }
};

/**
 * React hook for loading city boundaries with TanStack Query caching
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export const useCityBoundaries = () => {
  return useQuery({
    queryKey: ["cityBoundaries"],
    queryFn: loadCityBoundaries,
  });
};
