import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import bannerAdvisor from "../../assets/storefront-banner-advisor.jpg";
import bannerNewArrivals from "../../assets/storefront-banner-new-arrivals.jpg";
import bannerRackets from "../../assets/storefront-banner-rackets.jpg";
import bannerShoes from "../../assets/storefront-banner-shoes.jpg";
import { paths } from "../../routes/paths";

const slides = [
  {
    image: bannerNewArrivals,
    alt: "Sản phẩm cầu lông mới, sẵn sàng bứt phá",
    to: `${paths.products}?sort=newest`,
  },
  {
    image: bannerRackets,
    alt: "Vợt cầu lông, sức mạnh trong từng cú đánh",
    to: paths.productsByCategory("vot-cau-long"),
  },
  {
    image: bannerShoes,
    alt: "Giày cầu lông bám sân, bứt tốc",
    to: paths.productsByCategory("giay-cau-long"),
  },
  {
    image: bannerAdvisor,
    alt: "Tư vấn chọn dụng cụ cầu lông, chọn đúng chơi hay",
    to: paths.aiAdvisor,
  },
];

export function HomeHeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef(0);
  const dragPointerId = useRef<number | null>(null);
  const didDrag = useRef(false);

  useEffect(() => {
    if (isDragging || activeSlide >= slides.length - 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timeout = window.setTimeout(() => {
      setActiveSlide((current) => current + 1);
      setTrackIndex((current) => current + 1);
    }, 6500);
    return () => window.clearTimeout(timeout);
  }, [activeSlide, isDragging]);

  const showNextSlide = () => {
    if (activeSlide >= slides.length - 1) return;
    setActiveSlide((current) => current + 1);
    setTrackIndex((current) => current + 1);
  };

  const showPreviousSlide = () => {
    if (activeSlide <= 0) return;
    setActiveSlide((current) => current - 1);
    setTrackIndex((current) => current - 1);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragPointerId.current !== event.pointerId) return;
    if (!didDrag.current) {
      dragPointerId.current = null;
      return;
    }

    const threshold = Math.min(90, event.currentTarget.clientWidth * 0.12);
    const maxOffset = event.currentTarget.clientWidth;
    const finalOffset = Math.max(-maxOffset, Math.min(maxOffset, event.clientX - dragStartX.current));
    if (finalOffset <= -threshold) {
      showNextSlide();
    } else if (finalOffset >= threshold) {
      showPreviousSlide();
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragPointerId.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  const cancelDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragPointerId.current !== event.pointerId) return;
    dragPointerId.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, input, select, textarea")) return;
    dragStartX.current = event.clientX;
    dragPointerId.current = event.pointerId;
    didDrag.current = false;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragPointerId.current !== event.pointerId) return;
    const maxOffset = event.currentTarget.clientWidth;
    const rawOffset = Math.max(-maxOffset, Math.min(maxOffset, event.clientX - dragStartX.current));
    const nextOffset = (activeSlide === 0 && rawOffset > 0) || (activeSlide === slides.length - 1 && rawOffset < 0)
      ? 0
      : rawOffset;
    if (Math.abs(rawOffset) <= 8 && !didDrag.current) return;
    if (!didDrag.current) {
      didDrag.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }
    setDragOffset(nextOffset);
  };

  const selectSlide = (index: number) => {
    setActiveSlide(index);
    setTrackIndex(index);
  };

  const trackStyle = {
    transform: `translate3d(calc(${-trackIndex * 100}% + ${dragOffset}px), 0, 0)`,
  } as CSSProperties;

  return (
    <section
      className={isDragging ? "home-hero-carousel is-dragging" : "home-hero-carousel"}
      aria-roledescription="carousel"
      aria-label="Banner nổi bật, kéo ngang để đổi banner"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={cancelDrag}
    >
      <h1 className="sr-only">Dụng cụ, giày và phụ kiện cầu lông tại Badminton Shop</h1>
      <div
        className={isDragging ? "home-hero-track without-transition" : "home-hero-track"}
        style={trackStyle}
      >
        {slides.map((slide, originalIndex) => {
          const isAccessible = originalIndex === activeSlide;
          return (
            <article className="home-hero-slide" key={slide.alt} aria-hidden={!isAccessible}>
              <Link
                className="home-hero-slide-link"
                to={slide.to}
                tabIndex={isAccessible ? undefined : -1}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                onClick={(event) => {
                  if (!didDrag.current) return;
                  event.preventDefault();
                  didDrag.current = false;
                }}
              >
                <img
                  className="home-hero-image"
                  src={slide.image}
                  alt={isAccessible ? slide.alt : ""}
                  draggable={false}
                  loading={originalIndex === 0 ? "eager" : "lazy"}
                  fetchPriority={originalIndex === 0 ? "high" : "low"}
                  decoding="async"
                />
              </Link>
            </article>
          );
        })}
      </div>
      <div className="home-hero-dots" role="tablist" aria-label="Chọn banner">
        {slides.map((slide, index) => (
          <button
            type="button"
            key={slide.alt}
            className={index === activeSlide ? "active" : ""}
            role="tab"
            aria-selected={index === activeSlide}
            aria-label={`Hiển thị banner ${index + 1}`}
            onClick={() => selectSlide(index)}
          />
        ))}
      </div>
    </section>
  );
}
