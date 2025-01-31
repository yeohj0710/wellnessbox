import React from "react";
import { Rating } from "react-simple-star-rating";

interface StarRatingProps {
  rating: number;
  size?: number;
  allowFraction?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 24,
  allowFraction = true,
}) => {
  return (
    <Rating
      initialValue={rating}
      size={size}
      allowFraction={allowFraction}
      readonly
      transition
      fillColor="#FACC15"
      emptyColor="#D1D5DB"
      SVGstyle={{ display: "inline-block", marginBottom: "2px" }}
    />
  );
};

export default StarRating;
