import { useState, useEffect, useCallback } from "react";
import styles from "./imagePreviewModal.module.css";

export function ImagePreviewModal({ images = [], initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goToPrevious = useCallback(
    (e) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    },
    [images.length]
  );

  const goToNext = useCallback(
    (e) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    },
    [images.length]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (images.length === 0) return;
      if (e.key === "ArrowLeft") goToPrevious(e);
      if (e.key === "ArrowRight") goToNext(e);
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, goToPrevious, goToNext, onClose]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const showNavigation = images.length > 1;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button className={styles.closeButton} onClick={onClose}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {showNavigation && (
        <button
          className={`${styles.navButton} ${styles.navButtonLeft}`}
          onClick={goToPrevious}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      <img
        src={currentImage}
        alt={`Preview ${currentIndex + 1}`}
        className={styles.image}
        onClick={(e) => e.stopPropagation()}
      />

      {showNavigation && (
        <button
          className={`${styles.navButton} ${styles.navButtonRight}`}
          onClick={goToNext}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {showNavigation && (
        <div className={styles.counter}>
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
