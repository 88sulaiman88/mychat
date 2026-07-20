import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, password } = req.body ?? {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    }

    if (!process.env.SITE_PASSWORD || password !== process.env.SITE_PASSWORD) {
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "لا توجد رسالة" });
    }

    // حد بسيط لمنع الطلبات الضخمة والمكلفة.
    const cleanedMessages = messages
      .slice(-20)
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content ?? "").slice(0, 5000)
      }));

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input: cleanedMessages,
      max_output_tokens: 1200
    });

    return res.status(200).json({
      reply: response.output_text || "لم يصل رد نصي."
    });
  } catch (error) {
    console.error(error);
    const message =
      error?.status === 429
        ? "تم بلوغ حد الاستخدام أو الرصيد في OpenAI."
        : "حدث خطأ أثناء الاتصال بالخدمة.";
    return res.status(error?.status || 500).json({ error: message });
  }
}
