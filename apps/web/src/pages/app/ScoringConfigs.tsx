import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export const ScoringConfigs = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [maxHours, setMaxHours] = useState(8000);
  const [maxPrice, setMaxPrice] = useState(200000);

  const { data } = useQuery({
    queryKey: ["scoring"],
    queryFn: () =>
      apiFetch<{ configs: any[] }>("/api/scoring-configs", token ? {
        headers: { Authorization: `Bearer ${token}` },
      } : undefined),
  });

  const createConfig = useMutation({
    mutationFn: () =>
      apiFetch<{ config: any }>("/api/scoring-configs", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          weights: { hours: 0.35, price: 0.35, state: 0.3 },
          preferredStates: ["CA", "AZ", "TX", "IA"],
          maxHours,
          maxPrice,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoring"] });
      setName("");
    },
  });

  const activateConfig = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/scoring-configs/${id}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scoring"] }),
  });

  if (!token || !user || user.role === "demo") {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Scoring configs</h2>
        <p className="mt-2 text-sm text-slate-400">
          Upgrade to buyer tier to create and activate scoring configurations.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-xl font-semibold">Create scoring config</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Config name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            type="number"
            placeholder="Max hours"
            value={maxHours}
            onChange={(e) => setMaxHours(Number(e.target.value))}
          />
          <Input
            type="number"
            placeholder="Max price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          />
        </div>
        <Button onClick={() => createConfig.mutate()} disabled={!name}>
          Save config
        </Button>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {data?.configs.map((config) => (
          <Card key={config.id} className="space-y-3">
            <h3 className="text-lg font-semibold">{config.name}</h3>
            <p className="text-xs text-slate-400">Preferred states: {config.preferredStates.join(", ")}</p>
            <p className="text-xs text-slate-400">Max hours: {config.maxHours}</p>
            <p className="text-xs text-slate-400">Max price: ${config.maxPrice}</p>
            <Button
              variant={config.active ? "secondary" : "outline"}
              onClick={() => activateConfig.mutate(config.id)}
            >
              {config.active ? "Active" : "Activate"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
