
/**
 * Utilitário para processamento de imagens no Front-end.
 * Como estamos usando LocalStorage para persistência neste demo,
 * é crucial redimensionar e comprimir as imagens antes de salvar.
 */

export const processImageFile = (file: File, maxWidth: number = 1024, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const elem = document.createElement('canvas');
        
        // Calcular novas dimensões mantendo o Aspect Ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        
        const ctx = elem.getContext('2d');
        if (!ctx) {
          reject(new Error('Falha ao obter contexto do Canvas'));
          return;
        }
        
        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converter para Base64 JPEG comprimido
        resolve(elem.toDataURL('image/jpeg', quality));
      };
      
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
