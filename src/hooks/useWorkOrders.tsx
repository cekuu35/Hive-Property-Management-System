import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useWorkOrders() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("id, tenant_id, description, status, created_at")
        .order("created_at", { ascending: false });
      if (!error) setRequests(data || []);
    };
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel("maintenance_requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "maintenance_requests" },
        (payload) => {
          setRequests((prev) => {
            if (payload.eventType === "INSERT") {
              return [payload.new, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((req) =>
                req.id === payload.new.id ? payload.new : req
              );
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((req) => req.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return requests;
}