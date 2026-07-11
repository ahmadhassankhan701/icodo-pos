import React from "react";

/**
 * Official i codo logo (full lockup image — no separate wordmark text).
 * @param {"light"|"dark"|"nav"} variant
 */
export function IcodoLogo({
  variant = "light",
  height = 48,
  className = "",
  alt = "i codo",
}) {
  const src =
    variant === "dark"
      ? "/icodo-logo-dark.png"
      : variant === "nav"
        ? "/icodo-logo-nav.png"
        : "/icodo-logo-light.png";

  return (
    <img
      src={src}
      alt={alt}
      className={`mkt-logo mkt-logo--${variant} ${className}`.trim()}
      style={{
        height,
        width: "auto",
        maxWidth: "100%",
        display: "block",
        objectFit: "contain",
      }}
      decoding="async"
    />
  );
}

/** Top nav: transparent full logo + optional POS chip */
export function IcodoNavBrand({ height = 52, posLabel = "POS" }) {
  return (
    <span className="mkt-nav-brand">
      <IcodoLogo variant="nav" height={height} />
      {posLabel ? <span className="mkt-brand-pos">{posLabel}</span> : null}
    </span>
  );
}
