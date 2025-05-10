import { useState } from "react";
import { ZipWriter, BlobWriter, BlobReader } from "@zip.js/zip.js";

export default function App() {
  const [images, setImages] = useState<File[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [marginHorizontal, setMarginHorizontal] = useState<number>(24);
  const [marginVertical, setMarginVertical] = useState<number>(24);
  const [imageQuality, setImageQuality] = useState<number>(0.8); // Calidad de imagen (0.1 - 1.0)
  const [logoWidth, setLogoWidth] = useState<number>(24); // Ancho del logo en porcentaje
  const [logoPosition, setLogoPosition] = useState<
    "top-left" | "top-right" | "bottom-left" | "bottom-right"
  >("top-left");
  const [showLogoBackground, setShowLogoBackground] = useState<boolean>(false);
  const [logoBackgroundColor, setLogoBackgroundColor] =
    useState<string>("#ffffff");
  const [logoBackgroundOpacity, setLogoBackgroundOpacity] =
    useState<number>(0.5);
  const [logoBackgroundPaddingHorizontal, setLogoBackgroundPaddingHorizontal] =
    useState<number>(8);
  const [logoBackgroundPaddingVertical, setLogoBackgroundPaddingVertical] =
    useState<number>(8);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  ); // Índice de la imagen seleccionada

  console.log("Estado inicial:", { images, selectedImageIndex });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(files);

      // Si hay al menos una imagen, seleccionar la primera por defecto
      if (files.length > 0) {
        setSelectedImageIndex(0);
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setLogo(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addLogoToImage = async (
    imageFile: File
  ): Promise<{ name: string; blob: Blob }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        if (logo) {
          const logoImg = new Image();
          logoImg.src = logo;
          logoImg.onload = () => {
            // Calcula el ancho del logo basado en el porcentaje del ancho de la imagen
            const logoWidthFinal = img.width * (logoWidth / 100);

            // Calcula el alto del logo manteniendo la proporción original
            const ratio = logoWidthFinal / logoImg.width;
            const logoHeight = logoImg.height * ratio;

            // Determinar la posición del logo
            let x = marginHorizontal;
            let y = marginVertical;

            if (logoPosition === "top-right") {
              x = img.width - (logoWidthFinal + marginHorizontal);
            } else if (logoPosition === "bottom-left") {
              y = img.height - (logoHeight + marginVertical);
              x = marginHorizontal;
            } else if (logoPosition === "bottom-right") {
              x = img.width - (logoWidthFinal + marginHorizontal);
              y = img.height - (logoHeight + marginVertical);
            }

            // Calcular la posición final del fondo y el logo
            const finalLogoX = x;
            const finalLogoY = y;

            // Siempre calcular las posiciones del fondo aunque no se use
            const backgroundX = x - logoBackgroundPaddingHorizontal;
            const backgroundY = y - logoBackgroundPaddingVertical;

            const backgroundWidth =
              logoWidthFinal + logoBackgroundPaddingHorizontal * 2;
            const backgroundHeight =
              logoHeight + logoBackgroundPaddingVertical * 2;

            // Dibujar fondo del logo si está activado
            if (showLogoBackground) {
              // Simplificar el fillStyle a una sola línea
              const r = parseInt(logoBackgroundColor.slice(1, 3), 16);
              const g = parseInt(logoBackgroundColor.slice(3, 5), 16);
              const b = parseInt(logoBackgroundColor.slice(5, 7), 16);
              ctx.fillStyle = `rgba(${r},${g},${b},${logoBackgroundOpacity})`;
              ctx.fillRect(
                backgroundX,
                backgroundY,
                backgroundWidth,
                backgroundHeight
              );
            }

            // Dibuja el logo en la posición especificada
            ctx.drawImage(
              logoImg,
              finalLogoX,
              finalLogoY,
              logoWidthFinal,
              logoHeight
            );

            // Determinar el formato original de la imagen
            const originalFormat = imageFile.type;

            // Convertir a blob con la calidad especificada
            canvas.toBlob(
              (blob) => resolve({ name: imageFile.name, blob: blob! }),
              originalFormat,
              imageQuality
            );
          };
        } else {
          canvas.toBlob(
            (blob) => resolve({ name: imageFile.name, blob: blob! }),
            "image/png"
          );
        }
      };
    });
  };

  const handleDownloadZip = async () => {
    if (!images.length || !logo) return;

    const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
    for (const image of images) {
      const processedImage = await addLogoToImage(image);
      await zipWriter.add(
        processedImage.name,
        new BlobReader(processedImage.blob)
      );
    }

    const zipBlob = await zipWriter.close();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipBlob);
    link.download = "images_with_logo.zip";
    link.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4 bg-base-200 min-h-screen">
      <h1 className="text-3xl font-bold py-16">Añadir Logo y Descargar ZIP</h1>
      <div className="flex flex-col gap-5">
        {/* Sección de previsualización */}
        <div className="flex flex-col gap-4 p-5 border border-base-300 bg-base-100 rounded-lg">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">Previsualización</h2>
            <select
              className="select select-primary"
              value={selectedImageIndex || ""}
              onChange={(e) => {
                const selectedIndex = parseInt(e.target.value);
                if (!isNaN(selectedIndex)) {
                  setSelectedImageIndex(selectedIndex);
                }
              }}
            >
              <option value="">Selecciona una imagen</option>
              {images.map((image, index) => (
                <option
                  key={index}
                  value={index}
                  selected={selectedImageIndex === index}
                >
                  {image.name} ({(image.size / 1024).toFixed(2)} KB)
                </option>
              ))}
            </select>
          </div>
          <div className="relative overflow-hidden border-2 border-base-300 rounded-lg">
            {selectedImageIndex !== null && (
              <div className="">
                <img
                  src={URL.createObjectURL(images[selectedImageIndex])}
                  alt="Imagen seleccionada"
                  className="w-full h-auto object-contain"
                  style={{
                    maxWidth: "1200px",
                  }}
                />
                {logo && (
                  <div
                    className="absolute"
                    style={{
                      left: logoPosition.includes("right")
                        ? `auto`
                        : `${marginHorizontal}px`,
                      right: logoPosition.includes("right")
                        ? `${marginHorizontal}px`
                        : `auto`,
                      top: logoPosition.includes("bottom")
                        ? `auto`
                        : `${marginVertical}px`,
                      bottom: logoPosition.includes("bottom")
                        ? `${marginVertical}px`
                        : `auto`,
                      width: `${logoWidth}%`,
                    }}
                  >
                    <div className="relative">
                      {showLogoBackground ? (
                        <div
                          className="relative"
                          style={{
                            backgroundColor: `rgba(${parseInt(
                              logoBackgroundColor.slice(1, 3),
                              16
                            )}, 
                                          ${parseInt(
                                            logoBackgroundColor.slice(3, 5),
                                            16
                                          )}, 
                                          ${parseInt(
                                            logoBackgroundColor.slice(5, 7),
                                            16
                                          )}, 
                                          ${logoBackgroundOpacity})`,
                            padding: `${logoBackgroundPaddingHorizontal}px ${logoBackgroundPaddingVertical}px`,
                          }}
                        >
                          <img
                            src={logo}
                            alt="Logo"
                            className="relative"
                            style={{
                              width: "100%",
                              height: "auto",
                            }}
                          />
                        </div>
                      ) : (
                        <img
                          src={logo}
                          alt="Logo"
                          className="relative"
                          style={{
                            width: "100%",
                            height: "auto",
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-5 p-5 border border-base-300 bg-base-100 rounded-lg">
          <div className="flex w-full gap-5">
            <fieldset className="fieldset w-full">
              <legend className="fieldset-legend">
                Selecciona las imagenes
              </legend>
              <input
                type="file"
                multiple
                onChange={handleImageUpload}
                className="file-input file-input-primary w-full"
              />
            </fieldset>
            <fieldset className="fieldset w-full">
              <legend className="fieldset-legend">Selecciona el logo</legend>
              <input
                type="file"
                onChange={handleLogoUpload}
                className="file-input file-input-primary w-full"
              />
            </fieldset>
          </div>
          <div className="flex w-full gap-5">
            <div className="flex flex-col w-full">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Posición del Logo</legend>
                <select
                  value={logoPosition}
                  onChange={(e) =>
                    setLogoPosition(
                      e.target.value as
                        | "top-left"
                        | "top-right"
                        | "bottom-left"
                        | "bottom-right"
                    )
                  }
                  className="select select-primary"
                >
                  <option value="top-left">Superior Izquierda</option>
                  <option value="top-right">Superior Derecha</option>
                  <option value="bottom-left">Inferior Izquierda</option>
                  <option value="bottom-right">Inferior Derecha</option>
                </select>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Margen Horizontal (px)
                </legend>
                <input
                  type="number"
                  value={marginHorizontal}
                  onChange={(e) => setMarginHorizontal(Number(e.target.value))}
                  className="input input-primary"
                  min="0"
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Margen Vertical (px)
                </legend>
                <input
                  type="number"
                  value={marginVertical}
                  onChange={(e) => setMarginVertical(Number(e.target.value))}
                  className="input input-primary"
                  min="0"
                />
              </fieldset>
            </div>
            <fieldset className="fieldset w-full">
              <legend className="fieldset-legend w-full">
                Fondo del Logo{" "}
                <span className="text-right">
                  {Math.round(logoBackgroundOpacity * 100)}%
                </span>
              </legend>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showLogoBackground}
                    onChange={(e) => setShowLogoBackground(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                  <span>Mostrar fondo</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={logoBackgroundColor}
                    onChange={(e) => setLogoBackgroundColor(e.target.value)}
                    className="w-12 h-8 border border-primary rounded-md"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={logoBackgroundOpacity}
                    onChange={(e) =>
                      setLogoBackgroundOpacity(Number(e.target.value))
                    }
                    className="range range-primary"
                  />
                </div>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend w-full">
                    Ancho del logo{" "}
                    <span className="text-right">{logoWidth}%</span>
                  </legend>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={logoWidth}
                    onChange={(e) => setLogoWidth(Number(e.target.value))}
                    className="range range-primary"
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend w-full">
                    Calidad de imagen{" "}
                    <span className="text-right">{imageQuality}</span>
                  </legend>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={imageQuality}
                    onChange={(e) => setImageQuality(Number(e.target.value))}
                    className="range range-primary"
                  />
                </fieldset>
              </div>
            </fieldset>
            <div className="flex flex-col w-full">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Relleno Horizontal (px)
                </legend>
                <input
                  type="number"
                  value={logoBackgroundPaddingHorizontal}
                  onChange={(e) =>
                    setLogoBackgroundPaddingHorizontal(Number(e.target.value))
                  }
                  className="input input-primary"
                  min="0"
                  max="50"
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Relleno Vertical (px)
                </legend>
                <input
                  type="number"
                  value={logoBackgroundPaddingVertical}
                  onChange={(e) =>
                    setLogoBackgroundPaddingVertical(Number(e.target.value))
                  }
                  className="input input-primary"
                  min="0"
                  max="50"
                />
              </fieldset>
            </div>
          </div>
        </div>
        <button onClick={handleDownloadZip} className="btn btn-primary w-full">
          Descargar ZIP
        </button>
      </div>
    </div>
  );
}
