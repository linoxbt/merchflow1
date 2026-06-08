import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const walletSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet")
  .transform((v) => v.toLowerCase());

const statusSchema = z.enum(["pending", "paid", "overdue", "cancelled"]);

export const listInvoicesByMerchant = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string }) => z.object({ wallet: walletSchema }).parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("merchant_wallet", data.wallet)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { invoices: rows ?? [] };
  });

export const getInvoiceByNumber = createServerFn({ method: "POST" })
  .inputValidator((input: { number: string }) =>
    z.object({ number: z.string().trim().min(1).max(40) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("number", data.number)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { invoice: row };
  });

export const createInvoice = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      merchantWallet: string;
      customerWallet: string;
      description: string;
      amountUsd: number;
      amountQie: number;
      dueDate: string;
    }) =>
      z
        .object({
          merchantWallet: walletSchema,
          customerWallet: walletSchema,
          description: z.string().trim().min(1).max(500),
          amountUsd: z.number().positive().finite(),
          amountQie: z.number().positive().finite(),
          dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    // Next invoice number for this merchant
    const { data: latest } = await supabaseAdmin
      .from("invoices")
      .select("number")
      .eq("merchant_wallet", data.merchantWallet)
      .order("created_at", { ascending: false })
      .limit(1);
    let next = 1;
    if (latest && latest[0]?.number) {
      const n = parseInt(String(latest[0].number).replace(/\D/g, ""), 10);
      if (Number.isFinite(n)) next = n + 1;
    }
    const number = `INV-${String(next).padStart(4, "0")}`;

    const { data: row, error } = await supabaseAdmin
      .from("invoices")
      .insert({
        number,
        merchant_wallet: data.merchantWallet,
        customer_wallet: data.customerWallet,
        description: data.description,
        amount_usd: data.amountUsd,
        amount_qie: data.amountQie,
        due_date: data.dueDate,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { invoice: row };
  });

export const markInvoicePaid = createServerFn({ method: "POST" })
  .inputValidator((input: { number: string; txHash: string; payerWallet: string }) =>
    z
      .object({
        number: z.string().trim().min(1),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{2,}$/),
        payerWallet: walletSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("invoices")
      .update({ status: "paid", tx_hash: data.txHash, paid_at: new Date().toISOString() })
      .eq("number", data.number)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("activity").insert({
      type: "invoice_paid",
      actor_wallet: row.merchant_wallet,
      amount_qie: row.amount_qie,
      ref_id: row.number,
      tx_hash: data.txHash,
    });

    return { invoice: row };
  });

export const updateInvoiceStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { number: string; status: z.infer<typeof statusSchema> }) =>
    z.object({ number: z.string().trim().min(1), status: statusSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("invoices")
      .update({ status: data.status })
      .eq("number", data.number)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { invoice: row };
  });
