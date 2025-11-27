import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
  Marker,
  Popup,
  LayersControl,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { setLocation, clearLocation } from "../../../store/locationSlice";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import searchIcon from "../../../images/search.svg";
import styles from "./mapPage.module.css";

import { GeoJSON } from "react-leaflet";
import * as turf from "@turf/turf";
import API from "../../../API/API.js";
import { useCityBoundaries } from "./cityBoundaries.js";
import { ImagePreviewModal } from "../../common/imagePreviewModal/ImagePreviewModal";

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Create red marker icon
const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Map component that initializes the map view.
 * @param {Object} props - Component props
 * @param {Array<number>} props.center - Map center coordinates [lat, lng]
 * @param {number} props.zoom - Initial zoom level
 */
function MapView({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
}

/**
 * Component that handles map click events
 * @param {Object} props - Component props
 * @param {Function} props.onMapClick - Callback function when map is clicked
 */
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

/**
 * Center map on marker position
 * @param {Object} map - Leaflet map instance
 * @param {Array<number>} position - Marker position [lat, lng]
 */
function centerMapOnMarker(map, position) {
  if (!map || !position) return;

  // Get current zoom level and increase it slightly for better view
  const currentZoom = map.getZoom();
  const targetZoom = Math.min(currentZoom + 1, 18); // Increase zoom by 1 level, max 18

  // Center map on marker with smooth animation
  map.setView(position, targetZoom, {
    animate: true,
    duration: 1.0,
    easeLinearity: 0.25,
  });
}

/**
 * Marker component that automatically opens popup
 * @param {Object} props - Component props
 * @param {Array<number>} props.position - Marker position [lat, lng]
 * @param {Object} props.icon - Marker icon
 * @param {React.ReactNode} props.children - Popup content
 */
function MarkerWithAutoOpen({ position, icon, children }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    // Open popup after marker is mounted
    const timer = setTimeout(() => {
      if (markerRef.current) {
        try {
          // Get the Leaflet marker instance
          const markerInstance = markerRef.current.getInstance?.();
          if (
            markerInstance &&
            typeof markerInstance.openPopup === "function"
          ) {
            markerInstance.openPopup();
            // Center map on marker with offset
            centerMapOnMarker(map, position);
          }
        } catch (error) {
          console.error("Error opening popup:", error);
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [position, map]);

  return (
    <Marker
      position={position}
      icon={icon}
      ref={markerRef}
      eventHandlers={{
        add: (e) => {
          // Open popup automatically when marker is added to map
          setTimeout(() => {
            const marker = e.target;
            if (marker && typeof marker.openPopup === "function") {
              marker.openPopup();
              centerMapOnMarker(map, position);
            }
          }, 150);
        },
        click: () => {
          // Center map when marker is clicked
          centerMapOnMarker(map, position);
        },
      }}
    >
      <Popup>{children}</Popup>
    </Marker>
  );
}

/**
 * Map page component that displays an OpenStreetMap.
 * @param {Object} props - Component props
 * @returns {JSX.Element} MapPage component
 */
export function MapPage(props) {
  const defaultCenter = [45.0703, 7.6868]; // Turin, Italy coordinates
  const defaultZoom = 13;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useSelector((state) => state.location);

  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const hasLoadedRef = useRef(false);

  // Use TanStack Query hook for city boundaries
  const {
    data: cityBoundariesData,
    isLoading: boundariesLoading,
    error: boundariesError,
  } = useCityBoundaries();

  const cityBoundaries = cityBoundariesData?.cityBoundaries || null;
  const cityBounds = cityBoundariesData?.cityBounds || null;
  const maskPolygon = cityBoundariesData?.maskPolygon || null;

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadReports();
  }, []);

  // Check if both reports and boundaries are loaded
  useEffect(() => {
    if (reportsLoaded && !boundariesLoading) {
      setIsLoading(false);
    }
  }, [reportsLoaded, boundariesLoading]);

  // Check if there's an error loading city boundaries
  const hasBoundariesError = !!boundariesError;

  const loadReports = useCallback(async () => {
    try {
      const data = await API.getAllApprovedReports();
      setReports(data);
    } catch (error) {
      setError("Failed to load reports");
    } finally {
      setReportsLoaded(true);
    }
  }, []);

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  /**
   * Reverse geocoding: get address from coordinates
   */
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "User-Agent": "Participium App",
          },
        }
      );

      const data = await response.json();
      return data.display_name || "Address not found";
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return "Address not found";
    }
  };

  /**
   * Handle map click event
   */
  const handleMapClick = async (latlng) => {
    const lat = latlng.lat;
    const lng = latlng.lng;
    const coordinates = [lat, lng];

    // Check if the clicked point is inside Turin city limits
      const point = turf.point([latlng.lng, latlng.lat]);
    const isInside = turf.booleanPointInPolygon(point, cityBoundaries);
      if (!isInside) {
        dispatch(clearLocation());
        return;
    }

    // Get address using reverse geocoding
    const address = await reverseGeocode(lat, lng);

    // Save to Redux store
    dispatch(
      setLocation({
        position: coordinates,
        address: address,
        coordinates: { lat, lng },
      })
    );
  };

  /**
   * Handle create report button click
   */
  const handleCreateReport = () => {
    if (location.position && location.address) {
      navigate("/create_report");
    }
  };

  /**
   * Search for an address using Nominatim API
   */
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`,
        {
          headers: {
            "User-Agent": "Participium App",
          },
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const newCenter = [lat, lng];

        setMapCenter(newCenter);
        setMapZoom(15);
        // Save to Redux store
        dispatch(
          setLocation({
            position: newCenter,
            address: result.display_name,
            coordinates: { lat, lng },
          })
        );
      } else {
        setSearchError("Address not found");
        dispatch(clearLocation());
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Error searching for address");
      dispatch(clearLocation());
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={styles.mapWrapper}>
      <div className={styles.mapContainer}>
        {isLoading && (
          <div className={styles.loaderContainer}>
            <div className={styles.loaderSpinner}></div>
            <div className={styles.loaderText}>Loading map...</div>
          </div>
        )}
        {!isLoading && hasBoundariesError && (
          <div className={styles.errorContainer}>
            <div className={styles.errorMessage}>
              Failed to load the map, try to refresh the page
            </div>
          </div>
        )}
        {!isLoading && !hasBoundariesError && (
          <div className={styles.searchBar}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <div className={styles.searchInputWrapper}>
                <img
                  src={searchIcon}
                  alt="Search"
                  className={styles.searchIcon}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className={styles.searchInput}
                  disabled={isSearching}
                />
              </div>
              <button
                type="submit"
                className={styles.searchButton}
                disabled={isSearching}
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </form>
            {searchError && (
              <div className={styles.searchError}>{searchError}</div>
            )}
          </div>
        )}
        {!isLoading && (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            className={styles.map}
            zoomControl={false}
            maxBounds={cityBounds}
            maxBoundsViscosity={1.0}
          >
            <MapView center={mapCenter} zoom={mapZoom} />
            <MapClickHandler onMapClick={handleMapClick} />
            {maskPolygon && (
              <GeoJSON
                key={JSON.stringify(maskPolygon)}
                data={maskPolygon}
                style={{
                  fillColor: "#666666",
                  fillOpacity: 0.6,
                  color: "transparent",
                  weight: 0,
                }}
              />
            )}
            <LayersControl position="bottomleft">
              <LayersControl.BaseLayer checked name="OpenStreetMap">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Google">
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  attribution="Map data © Google"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Satellite">
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                  attribution="Map data © Google"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            <ApprovedReportsLayer
              reports={reports}
              onViewDetails={handleViewDetails}
            />

            {location.position && location.address && (
              <MarkerWithAutoOpen position={location.position} icon={redIcon}>
                <div>
                  <p>
                    <strong>Address:</strong> {location.address}
                  </p>
                  <p>
                    <strong>Coordinates:</strong>{" "}
                    {location.coordinates.lat.toFixed(6)},{" "}
                    {location.coordinates.lng.toFixed(6)}
                  </p>
                  <button
                    onClick={handleCreateReport}
                    className={styles.createReportButton}
                  >
                    Create report
                  </button>
                </div>
              </MarkerWithAutoOpen>
            )}
            <ZoomControl position="bottomright" />
          </MapContainer>
        )}
      </div>

      {isModalOpen && selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

// Blue Icon for existing reports (to distinguish them from the user's red selection)
const blueIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Report popup component
 * @param {Object} props - Component props
 * @param {Object} props.report - Report object
 * @param {Function} props.onViewDetails - Callback when details button is clicked
 */
function ReportPopup({ report, onViewDetails }) {
  return (
    <div className={styles.reportPopup}>
      <h4 className={styles.reportPopupTitle}>{report.title}</h4>
      <p className={styles.reportPopupInfo}>
        <strong>Category:</strong> {report.category.name}
      </p>
      <p className={styles.reportPopupInfo}>
        <strong>Status:</strong> {report.status.name}
      </p>
      <p className={styles.reportPopupInfo}>
        <strong>Reported by:</strong> {report.citizen.username}
      </p>
      <button className={styles.reportPopupButton} onClick={onViewDetails}>
        Details
      </button>
    </div>
  );
}

/**
 * Custom icon create function for clusters with formatted count
 * @param {Object} cluster - Cluster object from markercluster
 * @returns {L.DivIcon} Cluster icon
 */
function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  // Format count: 2-9 show number, 10+ show "9+"
  const displayCount = count >= 10 ? "9+" : count.toString();

  return L.divIcon({
    html: `<div style="
      background-color:rgb(58, 124, 217);
      color: white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${displayCount}</div>`,
    className: "marker-cluster-custom",
    iconSize: L.point(40, 40),
  });
}

/**
 * Marker component with click handler to center map
 * @param {Object} props - Component props
 * @param {Array<number>} props.position - Marker position [lat, lng]
 * @param {Object} props.icon - Marker icon
 * @param {React.ReactNode} props.children - Popup content
 */
function CenteredMarker({ position, icon, children }) {
  const map = useMap();

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => {
          // Center map when marker is clicked
          centerMapOnMarker(map, position);
        },
        popupopen: () => {
          // Also center when popup opens
          centerMapOnMarker(map, position);
        },
      }}
    >
      {children}
    </Marker>
  );
}

/**
 * Component that creates a marker cluster group for reports
 * @param {Object} props - Component props
 * @param {Array} props.reports - Array of report objects
 * @param {Function} props.onViewDetails - Callback when report is clicked
 */
function ApprovedReportsLayer({ reports, onViewDetails }) {
  if (!reports || reports.length === 0) {
    return null;
  }

  // Filter valid reports
  const validReports = reports.filter(
    (report) => report.latitude && report.longitude && report.id
  );

  if (validReports.length === 0) {
    return null;
  }

  return (
    <MarkerClusterGroup
      iconCreateFunction={createClusterIcon}
      maxClusterRadius={80}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
    >
      {validReports.map((report) => (
        <CenteredMarker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={blueIcon}
        >
          <Popup>
            <ReportPopup
              report={report}
              onViewDetails={() => onViewDetails(report)}
            />
          </Popup>
        </CenteredMarker>
      ))}
    </MarkerClusterGroup>
  );
}

function ReportDetailsModal({ report, onClose }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  const imageUrls = report.photos?.map((p) => p.image_url) || [];

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h2>{report.title}</h2>
            <button className={styles.closeButton} onClick={onClose}>
              ×
            </button>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.detailRow}>
              <strong>Description:</strong>
              <p>{report.description}</p>
            </div>

            <div className={styles.detailRow}>
              <strong>Category:</strong>
              <p>{report.category.name}</p>
            </div>

            <div className={styles.detailRow}>
              <strong>Status:</strong>
              <p>{report.status.name}</p>
            </div>

            <div className={styles.detailRow}>
              <strong>Reported by:</strong>
              <p>{report.citizen.username || "Anonymous"}</p>
            </div>

            <div className={styles.detailRow}>
              <strong>Created:</strong>
              <p>{new Date(report.created_at).toLocaleString()}</p>
            </div>

            {report.photos && report.photos.length > 0 && (
              <div className={styles.detailRow}>
                <strong>Images:</strong>
                <div className={styles.photoGrid}>
                  {report.photos.map((photo, index) => (
                    <img
                      key={photo.photo_id || index}
                      src={photo.image_url}
                      alt={`Report Image ${index + 1}`}
                      className={styles.reportPhoto}
                      onClick={() => setSelectedImageIndex(index)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedImageIndex !== null && (
        <ImagePreviewModal
          images={imageUrls}
          initialIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}
    </>
  );
}
