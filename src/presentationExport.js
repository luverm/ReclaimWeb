import PptxGenJS from "pptxgenjs";

function normalizeColor(value, fallback = "101113") {
  const cleaned = String(value || "")
    .trim()
    .replace(/^#/, "")
    .toUpperCase();

  return /^[0-9A-F]{6}$/.test(cleaned) ? cleaned : fallback;
}

function sanitizeFileName(value) {
  return String(value || "reclaim-presentation")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "reclaim-presentation";
}

export async function exportPresentationToPptx(presentation, brand) {
  if (!presentation?.slides?.length) {
    throw new Error("Generate a presentation before exporting.");
  }

  const pptx = new PptxGenJS();
  const primary = normalizeColor(brand?.primaryColor, "101113");
  const paper = "F6F4EF";
  const ink = "242426";
  const muted = "6E675F";
  const brandName = brand?.name || "Reclaim";

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = brandName;
  pptx.company = brandName;
  pptx.subject = presentation.themeNote || "AI-generated presentation";
  pptx.title = presentation.title || "Reclaim presentation";
  pptx.lang = "en-US";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
    lang: "en-US"
  };

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: paper };
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.35,
    line: { color: primary, transparency: 100 },
    fill: { color: primary }
  });
  titleSlide.addText(brandName.toUpperCase(), {
    x: 0.7,
    y: 0.75,
    w: 3,
    h: 0.3,
    fontFace: "Aptos",
    fontSize: 11,
    color: primary,
    bold: true,
    charSpace: 1.5
  });
  titleSlide.addText(presentation.title || "Presentation", {
    x: 0.7,
    y: 1.45,
    w: 8.8,
    h: 1.1,
    fontFace: "Aptos Display",
    fontSize: 24,
    bold: true,
    color: ink,
    margin: 0
  });
  titleSlide.addText(presentation.themeNote || "Generated in Reclaim", {
    x: 0.7,
    y: 2.75,
    w: 7.8,
    h: 1,
    fontFace: "Aptos",
    fontSize: 14,
    color: muted,
    margin: 0
  });

  presentation.slides.forEach((slideData, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: paper };

    slide.addShape(pptx.ShapeType.line, {
      x: 0.7,
      y: 0.75,
      w: 2.2,
      h: 0,
      line: { color: primary, width: 2.2 }
    });

    slide.addText(`Slide ${index + 1}`, {
      x: 0.7,
      y: 0.95,
      w: 2,
      h: 0.3,
      fontFace: "Aptos",
      fontSize: 10,
      color: primary,
      bold: true,
      charSpace: 1.1
    });

    slide.addText(slideData.title || `Slide ${index + 1}`, {
      x: 0.7,
      y: 1.3,
      w: 7.8,
      h: 0.7,
      fontFace: "Aptos Display",
      fontSize: 22,
      bold: true,
      color: ink,
      margin: 0
    });

    slide.addText(slideData.objective || "", {
      x: 0.7,
      y: 2.1,
      w: 7.5,
      h: 0.8,
      fontFace: "Aptos",
      fontSize: 13,
      color: muted,
      margin: 0
    });

    const bullets = (slideData.bullets || []).map((bullet) => ({
      text: bullet,
      options: {
        bullet: { indent: 12 },
        hanging: 3,
        breakLine: true
      }
    }));

    slide.addText(bullets.length ? bullets : [{ text: "Add key points here." }], {
      x: 0.95,
      y: 3.1,
      w: 7.4,
      h: 2.6,
      fontFace: "Aptos",
      fontSize: 16,
      color: ink,
      valign: "top",
      paraSpaceAfterPt: 10,
      breakLine: true
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.85,
      y: 1.3,
      w: 3.7,
      h: 4.35,
      rectRadius: 0.08,
      line: { color: primary, transparency: 85, width: 1 },
      fill: { color: "FFFFFF", transparency: 8 }
    });

    slide.addText("Speaker note", {
      x: 9.15,
      y: 1.6,
      w: 2.7,
      h: 0.3,
      fontFace: "Aptos",
      fontSize: 11,
      color: primary,
      bold: true
    });

    slide.addText(slideData.speakerNote || "No speaker note was generated for this slide.", {
      x: 9.15,
      y: 2.0,
      w: 2.9,
      h: 3.1,
      fontFace: "Aptos",
      fontSize: 11,
      color: ink,
      valign: "top"
    });
  });

  await pptx.writeFile({ fileName: `${sanitizeFileName(presentation.title)}.pptx` });
}
