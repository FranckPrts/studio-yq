import "server-only";
import QRCode from "qrcode";

/**
 * The QR code for a participation link, drawn on the server so the page, the
 * board and the download all get the same image and no QR code reaches the
 * client bundle.
 *
 * Always dark modules on white with the standard four-module margin, even on
 * the dark theme: inverted codes fail on some phone readers, and the white
 * border is the quiet zone they need to find the code. Level M survives a
 * glare spot on a projector screen and still makes a sparse code.
 */

const OPTIONS = {
  errorCorrectionLevel: "M",
  margin: 4,
  color: { dark: "#000000ff", light: "#ffffffff" },
} as const;

/** Big enough to stay crisp on a slide at full screen. */
const PNG_WIDTH = 1024;

export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...OPTIONS, type: "svg" });
}

export function qrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...OPTIONS, type: "png", width: PNG_WIDTH });
}

