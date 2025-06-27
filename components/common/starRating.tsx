import React from "react";
// @ts-expect-error: react-star-ratings에 대한 TypeScript 정의 파일이 없음
import StarRatings from "react-star-ratings";

interface StarRatingProps {
  rating: number;
  size?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, size = 24 }) => {
  return (
    <StarRatings
      rating={rating}
      starRatedColor="#FACC15"
      starEmptyColor="#D1D5DB"
      numberOfStars={5}
      starDimension={`${size}px`}
      starSpacing="2px"
      svgIconPath="M12 .587l3.668 7.431L24 9.75l-6 5.838 1.416 8.259L12 18.99 4.584 23.847 6 15.588 0 9.75l8.332-1.732z"
      svgIconViewBox="0 0 24 24"
    />
  );
};

export default StarRating;
