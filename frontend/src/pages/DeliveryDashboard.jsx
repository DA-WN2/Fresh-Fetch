import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  LogOut,
  Phone,
  Store,
  AlertTriangle,
  Map as MapIcon,
  Clock,
  Sun,
  Navigation,
  Camera
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap, 
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom EMOJI Map Icons - Always load instantly!
const truckIcon = new L.divIcon({
  html: '<div style="font-size: 20px; background: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 2px solid #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🚚</div>',
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});
const storeIcon = new L.divIcon({
  html: '<div style="font-size: 18px; background: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid #f59e0b; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏪</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});
const homeIcon = new L.divIcon({
  html: '<div style="font-size: 18px; background: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid #ef4444; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏠</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// Auto-zooms map to fit the current route
function FitMapBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 1) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] }); 
    }
  }, [coords, map]);
  return null;
}

const DeliveryDashboard = () => {
  const [routeBatches, setRouteBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deliveryPhotos, setDeliveryPhotos] = useState({});
  const [appMessage, setAppMessage] = useState({ text: "", type: "" });

  const [currentLocation, setCurrentLocation] = useState(null);
  const [trackingData, setTrackingData] = useState({});
  
  // THE FIX: Route state now holds the phase ('pickup' or 'delivery') and coordinates
  const [routePaths, setRoutePaths] = useState({}); 
  const [failedRoutes, setFailedRoutes] = useState({}); 

  const [isScreenAwake, setIsScreenAwake] = useState(false);
  const watchIdRef = useRef(null);
  const wakeLockRef = useRef(null);

  const navigate = useNavigate();

  const showMessage = (text, type = "error") => {
    setAppMessage({ text, type });
    setTimeout(() => {
      setAppMessage({ text: "", type: "" });
    }, 4500);
  };

  const fetchDeliveryOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await axios.get("http://127.0.0.1:8000/api/delivery/orders/", { headers: { Authorization: `Token ${token}` } });
      const orders = res.data;
      const groupedOrders = orders.reduce((acc, order) => {
        const key = order.batch_id || order.id.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(order);
        return acc;
      }, {});

      setRouteBatches(Object.values(groupedOrders));

      let requiresGps = false;
      for (const batch of Object.values(groupedOrders)) {
        // Fetch map data for BOTH pickup phase AND delivery phase
        if (batch.some((o) => ["shipped", "out for delivery"].includes(o.status.toLowerCase()))) {
          const batchKey = batch[0].batch_id || batch[0].id.toString();
          fetchTrackingData(batchKey);
          requiresGps = true;
        }
      }

      if (requiresGps && !currentLocation && !watchIdRef.current) {
        startBroadcastingLocation(true); 
      }

      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryOrders();
    return () => stopBroadcasting();
  }, [navigate]);

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        setIsScreenAwake(true);
      }
    } catch (err) {}
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
        setIsScreenAwake(false);
      });
    }
  };

  const startBroadcastingLocation = async (silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) showMessage("Geolocation is not supported by your browser", "error");
      return;
    }

    await requestWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });

        const token = localStorage.getItem("token");
        axios.post("http://127.0.0.1:8000/api/delivery/update-location/", 
            { lat: latitude, lng: longitude }, 
            { headers: { Authorization: `Token ${token}` } }
        ).catch(() => {});
      },
      (error) => {
        if (!silent) {
            if (error.code === error.PERMISSION_DENIED) {
                showMessage("Location permission denied. Please allow location in your browser.", "error");
            } else {
                showMessage("Failed to get GPS signal. Please try again.", "error");
            }
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 },
    );
  };

  const stopBroadcasting = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setCurrentLocation(null);
    releaseWakeLock();
  };

  const fetchTrackingData = async (batchId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://127.0.0.1:8000/api/tracking/${batchId}/`, { headers: { Authorization: `Token ${token}` } });
      setTrackingData((prev) => ({ ...prev, [batchId]: res.data }));
    } catch (err) {}
  };

  // --- THE FIX: TWO-PHASE ROUTING ENGINE ---
  useEffect(() => {
    routeBatches.forEach((batch) => {
      const isReadyForPickup = batch.every((o) => o.status.toLowerCase() === "shipped");
      const isOutForDelivery = batch.every((o) => o.status.toLowerCase() === "out for delivery");
      const batchKey = batch[0].batch_id || batch[0].id.toString();
      const mapData = trackingData[batchKey];

      // Determine current Phase
      const currentPhase = isOutForDelivery ? "delivery" : isReadyForPickup ? "pickup" : null;

      if (currentPhase && mapData && mapData.customer && currentLocation) {
        
        // If we haven't fetched the route for THIS specific phase yet
        if (routePaths[batchKey]?.phase !== currentPhase && !failedRoutes[`${batchKey}_${currentPhase}`]) {
          const fetchStreetRoute = async () => {
            try {
              const dLat = currentLocation.lat;
              const dLng = currentLocation.lng;

              let coords = [`${dLng},${dLat}`]; 
              
              // Only route to the specific targets for this phase!
              if (currentPhase === "pickup") {
                  mapData.stores.forEach((s) => coords.push(`${s.lng},${s.lat}`)); 
              } else if (currentPhase === "delivery") {
                  coords.push(`${mapData.customer.lng},${mapData.customer.lat}`); 
              }

              const coordString = coords.join(";");
              const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`);
              
              if (!response.ok) throw new Error("OSRM Network Error");
              const data = await response.json();

              if (data.routes && data.routes.length > 0) {
                const leafletCoords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]); 
                setRoutePaths((prev) => ({ ...prev, [batchKey]: { phase: currentPhase, coords: leafletCoords } }));
              }
            } catch (err) {
              setFailedRoutes((prev) => ({ ...prev, [`${batchKey}_${currentPhase}`]: true }));
            }
          };

          fetchStreetRoute();
        }
      }
    });
  }, [trackingData, currentLocation, routeBatches, routePaths, failedRoutes]);

  const handlePhotoSelect = (batchKey, file) => {
    setDeliveryPhotos((prev) => ({ ...prev, [batchKey]: file }));
  };

  const updateBatchStatus = async (batch, newStatus) => {
    const token = localStorage.getItem("token");
    const batchKey = batch[0].batch_id || batch[0].id.toString();

    if (newStatus === "Delivered" && !deliveryPhotos[batchKey]) {
      showMessage("Please upload a Proof of Delivery photo for this route!", "error");
      return;
    }

    try {
      await Promise.all(
        batch.map(async (order) => {
          const formData = new FormData();
          formData.append("status", newStatus);
          if (newStatus === "Delivered") formData.append("image", deliveryPhotos[batchKey]);
          return axios.post(`http://127.0.0.1:8000/api/delivery/update-order/${order.id}/`, formData, { headers: { Authorization: `Token ${token}`, "Content-Type": "multipart/form-data" } });
        }),
      );

      showMessage(`Route marked as ${newStatus}!`, "success");

      if (newStatus === "Out for Delivery") {
        fetchTrackingData(batchKey); // Map will seamlessly recalculate phase 2 route
      }
      if (newStatus === "Delivered") {
        stopBroadcasting();
      }

      fetchDeliveryOrders();
    } catch (err) {
      showMessage("Failed to update route status.", "error");
    }
  };

  if (loading)
    return <div style={{ textAlign: "center", marginTop: "100px", fontWeight: "bold", color: "var(--primary)" }}>Loading Consolidated Routes...</div>;

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", paddingBottom: "3rem", position: "relative" }}>
      
      {appMessage.text && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", backgroundColor: appMessage.type === "error" ? "#fee2e2" : appMessage.type === "alert" ? "#fef3c7" : "#d1fae5", color: appMessage.type === "error" ? "#ef4444" : appMessage.type === "alert" ? "#b45309" : "#10b981", border: `1px solid ${appMessage.type === "error" ? "#fca5a5" : appMessage.type === "alert" ? "#fde68a" : "#6ee7b7"}`, padding: "12px 24px", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 99999, display: "flex", alignItems: "center", gap: "10px", fontWeight: "bold", animation: "fadeIn 0.3s ease-in-out" }}>
          {appMessage.type === "error" || appMessage.type === "alert" ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
          {appMessage.text}
        </div>
      )}

      <div style={{ backgroundColor: "#0f172a", color: "white", padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 9999 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Truck size={28} color={currentLocation ? "#10b981" : "#38bdf8"} />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.2rem" }}>Driver Portal</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <p style={{ margin: 0, fontSize: "0.8rem", color: currentLocation ? "#10b981" : "#94a3b8" }}>
                {currentLocation ? "GPS Active & Broadcasting" : "Standby Mode"}
              </p>
              {isScreenAwake && <span title="Screen awake" style={{ display: "flex", alignItems: "center", color: "#fbbf24" }}><Sun size={12} /></span>}
            </div>
          </div>
        </div>
        <button onClick={() => { stopBroadcasting(); localStorage.clear(); navigate("/login"); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "8px 12px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <LogOut size={16} /> Exit
        </button>
      </div>

      <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "0 1rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {routeBatches.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "white", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
            <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: "1rem" }} />
            <h3 style={{ color: "#334155", margin: "0 0 8px 0" }}>You're all caught up!</h3>
            <p style={{ color: "#94a3b8", margin: 0 }}>No active deliveries right now.</p>
          </div>
        ) : (
          routeBatches.map((batch) => {
            const isPending = batch.some((o) => ["pending", "processing"].includes(o.status.toLowerCase()));
            const isReadyForPickup = batch.every((o) => o.status.toLowerCase() === "shipped");
            const isOutForDelivery = batch.every((o) => o.status.toLowerCase() === "out for delivery");

            const customerName = batch[0].customer_name.toUpperCase();
            const customerPhone = batch[0].customer_phone;
            const deliveryAddress = batch[0].delivery_address;
            const batchKey = batch[0].batch_id || batch[0].id.toString();
            const routeIdDisplay = batch.map((o) => `#${o.id}`).join(" / ");
            const isMultiStop = batch.length > 1;

            const mapData = trackingData[batchKey];
            const streetRoute = routePaths[batchKey];

            const driverLat = currentLocation?.lat || mapData?.agent?.lat || 9.5785;
            const driverLng = currentLocation?.lng || mapData?.agent?.lng || 76.6180;

            // Generate map bounds & fallback lines for ONLY the active phase
            const phaseMapPoints = [];
            if ((isReadyForPickup || isOutForDelivery) && mapData) {
              phaseMapPoints.push([driverLat, driverLng]);
              if (isReadyForPickup) {
                 mapData.stores.forEach(s => phaseMapPoints.push([s.lat, s.lng]));
                 if (mapData.customer) phaseMapPoints.push([mapData.customer.lat, mapData.customer.lng]); // Keep customer in view
              } else if (isOutForDelivery) {
                 phaseMapPoints.push([mapData.customer.lat, mapData.customer.lng]);
              }
            }

            return (
              <div key={batchKey} style={{ background: "white", borderRadius: "12px", border: "2px solid", borderColor: isMultiStop ? "#8b5cf6" : "#e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                
                {/* DYNAMIC STATUS BAR */}
                <div style={{ background: isPending ? "#f3f4f6" : isReadyForPickup ? "#fef3c7" : "#dbeafe", padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: isPending ? "#475569" : isReadyForPickup ? "#b45309" : "#1e40af", display: "flex", alignItems: "center", gap: "6px" }}>
                    {isPending ? <Clock size={18} /> : isMultiStop ? <MapIcon size={18} /> : isReadyForPickup ? <Package size={18} /> : <Truck size={18} />}
                    {isPending ? "Waiting for Packaging..." : isMultiStop ? "Consolidated Multi-Stop Route" : isReadyForPickup ? "Navigating to Pickup" : "Navigating to Customer"}
                  </strong>
                  <span style={{ fontWeight: "800", color: "#334155", fontSize: "0.85rem" }}>{routeIdDisplay}</span>
                </div>

                <div style={{ padding: "1.5rem" }}>
                  
                  {(isReadyForPickup || isOutForDelivery) && !currentLocation && (
                    <div style={{ background: "#fef3c7", border: "1px solid #fde68a", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <span style={{ color: "#b45309", fontSize: "0.85rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                           <AlertTriangle size={16} /> GPS is Paused
                        </span>
                        <button onClick={() => startBroadcastingLocation(false)} style={{ background: "#b45309", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.85rem" }}>
                            <Navigation size={14} /> Resume Navigation
                        </button>
                    </div>
                  )}

                  {/* MAP CONTAINER RENDERS FOR BOTH PICKUP & DELIVERY PHASES */}
                  {(isReadyForPickup || isOutForDelivery) && mapData && mapData.customer && (
                    <div style={{ height: "300px", borderRadius: "8px", overflow: "hidden", marginBottom: "1.5rem", border: "1px solid #cbd5e1", position: "relative", zIndex: 1 }}>
                      <MapContainer center={[driverLat, driverLng]} zoom={13} style={{ height: "100%", width: "100%" }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        
                        <FitMapBounds coords={phaseMapPoints} />
                        
                        {/* Always show Driver on top */}
                        <Marker position={[driverLat, driverLng]} icon={truckIcon} zIndexOffset={1000}>
                          <Popup>You are here</Popup>
                        </Marker>
                        
                        {/* Show Stores */}
                        {mapData.stores.map((store, i) => (
                          <Marker key={i} position={[store.lat, store.lng]} icon={storeIcon}>
                            <Popup>Pickup: {store.name}</Popup>
                          </Marker>
                        ))}

                        {/* Show Customer */}
                        <Marker position={[mapData.customer.lat, mapData.customer.lng]} icon={homeIcon}>
                          <Popup>Dropoff Location</Popup>
                        </Marker>
                        
                        {/* Draw Phase-Specific Route */}
                        {streetRoute && streetRoute.coords ? (
                          <Polyline 
                            key={`osrm-route-${batchKey}-${streetRoute.phase}`} 
                            positions={streetRoute.coords} 
                            color="#3b82f6" 
                            weight={5} 
                            opacity={0.8} 
                          />
                        ) : (
                          // Fallback straight lines for specific phase
                          <Polyline
                            key={`fallback-route-${batchKey}`}
                            positions={
                                isReadyForPickup 
                                ? [[driverLat, driverLng], ...mapData.stores.map(s => [s.lat, s.lng])]
                                : [[driverLat, driverLng], [mapData.customer.lat, mapData.customer.lng]]
                            }
                            color="#3b82f6"
                            dashArray="5, 10"
                            weight={3}
                            opacity={0.5}
                          />
                        )}
                      </MapContainer>
                    </div>
                  )}

                  <h3 style={{ margin: "0 0 1.5rem 0", fontSize: "1rem", color: "#0f172a", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Navigation Protocol
                  </h3>

                  {batch.map((stop, i) => {
                    const isStopReady = stop.status.toLowerCase() !== "pending" && stop.status.toLowerCase() !== "processing";
                    return (
                      <div key={stop.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "1.5rem", position: "relative" }}>
                        <div style={{ position: "absolute", left: "17px", top: "36px", bottom: "-30px", width: "2px", backgroundColor: "#e2e8f0", zIndex: 0 }}></div>
                        <div style={{ background: "#eff6ff", padding: "8px", borderRadius: "50%", color: "#3b82f6", zIndex: 1, border: "2px solid white" }}>
                          <Store size={18} />
                        </div>
                        <div style={{ width: "100%" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", color: "#3b82f6", textTransform: "uppercase", fontWeight: "900" }}>
                              STOP {i + 1}: PICKUP
                            </p>
                            <span style={{ fontSize: "0.7rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px", color: isStopReady ? "#10b981" : "#f59e0b" }}>
                              {isStopReady ? <><CheckCircle2 size={12} /> Packed</> : <><Clock size={12} /> Packing...</>}
                            </span>
                          </div>
                          <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", opacity: isStopReady ? 1 : 0.6 }}>
                            <p style={{ margin: "0 0 2px 0", fontWeight: "bold", color: "#0f172a" }}>{stop.store_name}</p>
                            <p style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "#475569", lineHeight: "1.4" }}>{stop.pickup_address}</p>
                            {stop.packing_photo && (
                              <div>
                                <p style={{ margin: "0 0 4px 0", fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <Camera size={12} /> Package ID: #{stop.id}
                                </p>
                                <img src={stop.packing_photo} alt="Package" style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "1rem" }}>
                    <div style={{ background: "#fef2f2", padding: "8px", borderRadius: "50%", color: "#ef4444", zIndex: 1, border: "2px solid white" }}>
                      <MapPin size={18} />
                    </div>
                    <div style={{ width: "100%" }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", color: "#ef4444", textTransform: "uppercase", fontWeight: "900" }}>
                        FINAL STOP: DELIVERY
                      </p>
                      <div style={{ backgroundColor: "#fef2f2", padding: "12px", borderRadius: "8px", border: "1px solid #fecaca", opacity: isPending ? 0.6 : 1 }}>
                        <p style={{ margin: "0 0 2px 0", fontWeight: "bold", color: "#0f172a" }}>{customerName}</p>
                        <p style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#475569", lineHeight: "1.4" }}>{deliveryAddress || "Address not provided"}</p>
                        {customerPhone && customerPhone !== "Not Provided" && (
                          <a href={`tel:${customerPhone}`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "white", color: "#0d9488", padding: "6px 12px", borderRadius: "20px", textDecoration: "none", fontSize: "0.85rem", fontWeight: "bold", border: "1px solid #ccfbf1" }}>
                            <Phone size={14} /> Call Customer
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOutForDelivery && (
                    <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f0fdfa", border: "1px dashed #5eead4", borderRadius: "8px" }}>
                      <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "#0f766e", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Camera size={16} /> Upload Single Proof of Delivery
                      </p>
                      <p style={{ margin: "0 0 12px 0", fontSize: "0.75rem", color: "#475569" }}>
                        Take one photo capturing all packages dropped at the customer's door.
                      </p>
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoSelect(batchKey, e.target.files[0]) } style={{ width: "100%", fontSize: "0.9rem", color: "#334155" }} />
                    </div>
                  )}

                  <div style={{ marginTop: "1.5rem", borderTop: "1px dashed #e2e8f0", paddingTop: "1.5rem" }}>
                    {isPending && (
                      <button disabled style={{ width: "100%", padding: "14px", backgroundColor: "#cbd5e1", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1rem", cursor: "not-allowed" }}>
                        Waiting for all stores to pack...
                      </button>
                    )}

                    {isReadyForPickup && (
                      <button onClick={() => updateBatchStatus(batch, "Out for Delivery") } style={{ width: "100%", padding: "14px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <Package size={18} /> {isMultiStop ? "Packages Picked Up (Head to Customer)" : "Package Picked Up (Head to Customer)"}
                      </button>
                    )}

                    {isOutForDelivery && (
                      <button onClick={() => updateBatchStatus(batch, "Delivered")} disabled={!deliveryPhotos[batchKey]} style={{ width: "100%", padding: "14px", backgroundColor: deliveryPhotos[batchKey] ? "#10b981" : "#94a3b8", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: deliveryPhotos[batchKey] ? "pointer" : "not-allowed", transition: "0.3s" }}>
                        <CheckCircle2 size={18} /> {deliveryPhotos[batchKey] ? "Mark Route Complete" : "Photo Required to Complete"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;