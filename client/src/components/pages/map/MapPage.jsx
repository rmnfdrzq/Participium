import { useEffect, useState, useRef } from "react";
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
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { setLocation, clearLocation } from "../../../store/locationSlice";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import searchIcon from "../../../images/search.svg";
import styles from "./mapPage.module.css";

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
 * Marker component that automatically opens popup
 * @param {Object} props - Component props
 * @param {Array<number>} props.position - Marker position [lat, lng]
 * @param {Object} props.icon - Marker icon
 * @param {React.ReactNode} props.children - Popup content
 */
function MarkerWithAutoOpen({ position, icon, children }) {
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
          }
        } catch (error) {
          console.error("Error opening popup:", error);
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [position]);

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
            }
          }, 150);
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

    // Get address using reverse geocoding
    const address = await reverseGeocode(lat, lng);

    // Log to console
    console.log("Coordinates:", { lat, lng });
    console.log("Address:", address);

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
      console.log("Create report for:", location);
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
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          className={styles.map}
          zoomControl={false}
        >
          <MapView center={mapCenter} zoom={mapZoom} />
          <MapClickHandler onMapClick={handleMapClick} />
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
      </div>
    </div>
  );
}
