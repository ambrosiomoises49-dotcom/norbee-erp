"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  success?: boolean;
  message?: string;
};

export default function ConseilGestionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const loadAiDashboard = async () => {
      try {
        const response = await fetch("/api/ai/dashboard");

        if (!response.ok) {
          throw new Error("Erro ao carregar dashboard IA");
        }

        const result = await response.json();

        setData(result);
      } catch (error) {
        console.error(error);

        setData({
          success: false,
          message: "Erro ao carregar dashboard IA",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadAiDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p>Chargement IA...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Conseil de Gestion IA
        </h1>

        <p className="text-base-content/70">
          Dashboard intelligent connecté à l’ERP.
        </p>
      </div>

      <div className="card bg-base-100 shadow-xl border border-base-300">
        <div className="card-body">
          <h2 className="card-title">
            Statut IA
          </h2>

          <p>
            {data?.message || "IA opérationnelle"}
          </p>
        </div>
      </div>
    </div>
  );
}