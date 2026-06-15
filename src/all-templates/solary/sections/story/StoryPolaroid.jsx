import React from "react";

/* StoryPolaroid — a single, light polaroid for one Story chapter.
   The stacked-photo carousel was removed; each chapter now shows ONE photo.
   Purely presentational — cross-fade and parallax are driven by the parent.
   When no photo is set it renders the cosmic placeholder (a faint star). */

export default function StoryPolaroid({ photo, number, className = "" }) {
  return (
    <figure className={`story-polaroid ${className}`}>
      <div className="story-polaroid__well">
        {photo ? (
          <img
            className="story-polaroid__img"
            src={photo}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="story-polaroid__placeholder" aria-hidden="true">
            <span className="story-polaroid__star">✦</span>
          </div>
        )}
        {number != null && (
          <span className="story-polaroid__num" aria-hidden="true">
            {String(number).padStart(2, "0")}
          </span>
        )}
      </div>
    </figure>
  );
}
