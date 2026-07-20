import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MAX_FILES = 3;
const MAX_TOTAL_FILE_BYTES = 2_500_000;

const MIME_BY_EXTENSION = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  html: "text/html",
  htm: "text/html",
  xml: "text/xml",
  csv: "text/csv",
  tsv: "text/tsv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

function extensionOf(filename = "") {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function approximateBase64Bytes(base64 = "") {
  const clean = base64.replace(/\s/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .slice(-20)
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: String(message?.content ?? "").slice(0, 8_000)
    }))
    .filter((message) => message.content.trim());
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, password, files = [] } = req.body ?? {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY غير مضبوط في Vercel."
      });
    }

    if (!process.env.SITE_PASSWORD || password !== process.env.SITE_PASSWORD) {
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    }

    const cleanedMessages = cleanMessages(messages);

    if (!cleanedMessages.length && !files.length) {
      return res.status(400).json({ error: "اكتب رسالة أو أرفق ملفًا." });
    }

    if (!Array.isArray(files) || files.length > MAX_FILES) {
      return res.status(400).json({
        error: `يمكن إرفاق ${MAX_FILES} ملفات كحد أقصى في الطلب الواحد.`
      });
    }

    const uploadedContent = [];
    let totalBytes = 0;

    for (const file of files) {
      const filename = String(file?.name ?? "").slice(0, 180);
      const base64 = String(file?.data ?? "");
      const extension = extensionOf(filename);
      const mimeType = MIME_BY_EXTENSION[extension];

      if (!filename || !base64 || !mimeType) {
        return res.status(400).json({
          error: `نوع الملف غير مدعوم: ${filename || "ملف بلا اسم"}`
        });
      }

      const fileBytes = approximateBase64Bytes(base64);
      totalBytes += fileBytes;

      if (totalBytes > MAX_TOTAL_FILE_BYTES) {
        return res.status(413).json({
          error: "الحجم الإجمالي للملفات يجب ألا يتجاوز 2.5 ميجابايت في هذه النسخة."
        });
      }

      const inputFile = {
        type: "input_file",
        filename,
        file_data: `data:${mimeType};base64,${base64}`
      };

      if (extension === "pdf") {
        inputFile.detail = "auto";
      }

      uploadedContent.push(inputFile);
    }

    const history = [...cleanedMessages];
    const currentMessage = history.pop();

    const prompt =
      currentMessage?.content?.trim() ||
      "حلّل الملفات المرفقة، ولخّص أهم النقاط، ونبّهني إلى أي ملاحظات أو مخاطر مهمة.";

    const input = history.map((message) => ({
      role: message.role,
      content: message.content
    }));

    input.push({
      role: "user",
      content: [
        { type: "input_text", text: prompt },
        ...uploadedContent
      ]
    });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions:
        "أجب بلغة المستخدم. عند تحليل مستند، فرّق بوضوح بين ما ورد في الملف وبين استنتاجاتك، ولا تختلق معلومات غير موجودة.",
      input,
      max_output_tokens: 2_000
    });

    return res.status(200).json({
      reply: response.output_text || "لم يصل رد نصي."
    });
  } catch (error) {
    console.error(error);

    let message = "حدث خطأ أثناء الاتصال بالخدمة.";

    if (error?.status === 429) {
      message = "تم بلوغ حد الاستخدام أو الرصيد في OpenAI.";
    } else if (error?.status === 413) {
      message = "حجم الملف أكبر من الحد المسموح.";
    } else if (error?.message) {
      message = error.message;
    }

    return res.status(error?.status || 500).json({ error: message });
  }
}
