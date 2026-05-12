import { Suspense } from "react";

import StockClient from "@/features/stock/components/StockClient";

export default function StockPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StockClient />
    </Suspense>
  );
}