"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ArrowLeft,
  Download,
  Printer,
  ReceiptText,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";

type InvoiceData = {
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    customerName: string | null;
    customerTaxId: string | null;
    subtotal: string;
    discountAmount: string;
    totalAmount: string;
    paymentMethod: string;
    status: string;
  };
  company: {
    name?: string | null;
    country?: string | null;
    currency?: string | null;
  } | null;
  sale: {
    id: string;
    saleNumber: string;
    totalAmount: string;
    paymentMethod: string;
    createdAt: string;
    cantina?: {
      name: string;
      code: string;
      location?: string | null;
    } | null;
    items: {
      id: string;
      quantity: number;
      unitPrice: string;
      totalPrice: string;
      product: {
        name: string;
        internalCode: string;
        unit: string;
      };
    }[];
  };
};

export default function InvoiceClient({ saleId }: { saleId: string }) {
  const router = useRouter();
  const { t, lang } = useI18n();

  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  const locale = lang === "fr" ? "fr-FR" : lang === "en" ? "en-GB" : "pt-PT";

  async function loadInvoice() {
    setLoading(true);

    try {
      const res = await fetch(`/api/invoices/${saleId}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (res.ok) {
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
  const timeout = setTimeout(() => {
    void loadInvoice();
  }, 0);

  return () => clearTimeout(timeout);
}, [saleId]);

  function formatMoney(value: number | string) {
  const amount = Number(value || 0);
  const currency = company?.currency || "EUR";

  if (currency === "AOA") {
    return `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0)} Kz`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

  function formatDate(value: string) {
    return new Date(value).toLocaleString(locale);
  }

  function paymentLabel(method: string) {
    if (method === "CASH") return t("cash");
    if (method === "CARD") return t("card");
    if (method === "TRANSFER") return t("transfer");
    if (method === "MOBILE_MONEY") return t("mobileMoney");
    return method || "-";
  }

  function statusLabel(status: string) {
    if (status === "ISSUED") return t("issued");
    if (status === "CANCELLED") return t("cancelled");
    return status;
  }

  function downloadPDF() {
    if (!data) return;

    const doc = new jsPDF("portrait", "mm", "a4");

    const companyName = data.company?.name || "Norbee ERP";
    const invoice = data.invoice;
    const sale = data.sale;

    doc.setFontSize(18);
    doc.text(t("invoice").toUpperCase(), 14, 18);

    doc.setFontSize(11);
    doc.text(companyName, 14, 28);
    doc.text(`${t("invoiceNumber")}: ${invoice.invoiceNumber}`, 14, 38);
    doc.text(`${t("date")}: ${formatDate(invoice.invoiceDate)}`, 14, 45);
    doc.text(`${t("saleNumber")}: ${sale.saleNumber}`, 14, 52);

    doc.text(`${t("cantina")}: ${sale.cantina?.name || "-"}`, 120, 38);
    doc.text(`${t("code")}: ${sale.cantina?.code || "-"}`, 120, 45);
    doc.text(`${t("payment")}: ${paymentLabel(invoice.paymentMethod)}`, 120, 52);

    doc.setFontSize(12);
    doc.text(t("customer"), 14, 66);

    doc.setFontSize(10);
    doc.text(`${t("name")}: ${invoice.customerName || t("finalCustomer")}`, 14, 74);
    doc.text(`${t("taxId")}: ${invoice.customerTaxId || "-"}`, 14, 81);

    autoTable(doc, {
      startY: 92,
      head: [[t("product"), t("code"), t("qty"), t("price"), t("total")]],
      body: sale.items.map((item) => [
        item.product.name,
        item.product.internalCode,
        String(item.quantity),
        formatMoney(item.unitPrice),
        formatMoney(item.totalPrice),
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [18, 58, 92],
        textColor: 255,
      },
    });

    const finalY =
  (doc as jsPDF & {
    lastAutoTable?: {
      finalY?: number;
    };
  }).lastAutoTable?.finalY || 120;

    doc.setFontSize(11);
    doc.text(`${t("subtotal")}: ${formatMoney(invoice.subtotal)}`, 130, finalY + 12);
    doc.text(`${t("discount")}: ${formatMoney(invoice.discountAmount)}`, 130, finalY + 20);

    doc.setFontSize(14);
    doc.text(`${t("total")}: ${formatMoney(invoice.totalAmount)}`, 130, finalY + 32);

    doc.setFontSize(8);
    doc.text(
      `${t("invoiceFooter")} ID: ${invoice.id}`,
      14,
      285
    );

    doc.save(`${invoice.invoiceNumber}.pdf`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] p-8 text-slate-500">
        {t("loadingInvoice")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] p-8 text-red-600">
        {t("invoiceNotFound")}
      </div>
    );
  }

  const { invoice, sale, company } = data;

  return (
    <div className="min-h-screen bg-[#F4F7FA] p-5">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between print:hidden">
          <button
            onClick={() => router.back()}
            className="rounded-[14px] border px-4 py-2.5 text-sm font-bold text-[#123A5C] flex items-center gap-2 bg-white"
          >
            <ArrowLeft size={17} />
            {t("back")}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-[14px] border border-[#123A5C] px-4 py-2.5 text-sm font-bold text-[#123A5C] flex items-center gap-2 bg-white"
            >
              <Printer size={17} />
              {t("print")}
            </button>

            <button
              onClick={downloadPDF}
              className="rounded-[14px] bg-[#123A5C] px-4 py-2.5 text-sm font-bold text-white flex items-center gap-2"
            >
              <Download size={17} />
              {t("downloadPdf")}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-none">
          <div className="bg-[#123A5C] text-white px-8 py-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black">{t("invoice").toUpperCase()}</h1>
              <p className="text-white/70 text-sm mt-1">
                {t("automaticCommercialDocument")}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-white/70">{t("number")}</p>
              <p className="text-xl font-black">{invoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-[18px] bg-slate-50 p-5">
                <p className="text-xs text-slate-500">{t("company")}</p>
                <h2 className="text-xl font-black text-slate-800 mt-1">
                  {company?.name || "Norbee ERP"}
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  {t("country")}: {company?.country || "-"}
                </p>
                <p className="text-sm text-slate-500">
                  {t("currency")}: {company?.currency || "Kz"}
                </p>
              </div>

              <div className="rounded-[18px] bg-slate-50 p-5">
                <p className="text-xs text-slate-500">{t("customer")}</p>
                <h2 className="text-xl font-black text-slate-800 mt-1">
                  {invoice.customerName || t("finalCustomer")}
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  {t("taxId")}: {invoice.customerTaxId || "-"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoCard label={t("date")} value={formatDate(invoice.invoiceDate)} />
              <InfoCard label={t("sale")} value={sale.saleNumber} />
              <InfoCard label={t("payment")} value={paymentLabel(invoice.paymentMethod)} />
              <InfoCard label={t("status")} value={statusLabel(invoice.status)} success />
            </div>

            <div className="rounded-[18px] border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">{t("product")}</th>
                    <th className="px-5 py-3 text-left">{t("code")}</th>
                    <th className="px-5 py-3 text-center">{t("qty")}</th>
                    <th className="px-5 py-3 text-right">{t("price")}</th>
                    <th className="px-5 py-3 text-right">{t("total")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        {item.product.name}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {item.product.internalCode}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {item.quantity}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-[#123A5C]">
                        {formatMoney(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-sm rounded-[20px] bg-slate-50 p-5 space-y-3">
                <Line label={t("subtotal")} value={formatMoney(invoice.subtotal)} />
                <Line label={t("discount")} value={formatMoney(invoice.discountAmount)} />

                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-lg font-black text-slate-800">
                    {t("total")}
                  </span>
                  <span className="text-2xl font-black text-green-700">
                    {formatMoney(invoice.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-dashed border-slate-300 p-5 flex items-center gap-3 text-slate-500">
              <ReceiptText size={22} />
              <p className="text-sm">{t("invoiceSaveNotice")}</p>
            </div>

            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={18} />
              <p className="text-sm font-bold">{t("invoiceIssuedSuccess")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  success = false,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="rounded-[16px] bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-sm font-black mt-1 ${
          success ? "text-green-700" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}