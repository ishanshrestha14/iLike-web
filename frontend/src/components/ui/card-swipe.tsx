"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
// @ts-expect-error - CSS module import
import "swiper/css";
// @ts-expect-error - CSS module import
import "swiper/css/effect-cards";
// @ts-expect-error - CSS module import
import "swiper/css/effect-coverflow";

import { EffectCards } from "swiper/modules";

import { Heart, X, ChevronDown, Undo2 } from "lucide-react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";

interface CarouselProps {
  images: { src: string; alt: string }[];
  autoplayDelay?: number;
  slideShadows: boolean;
  userName?: string;
  userAge?: number;
  userHobbies?: string[];
  userBio?: string;
  userDistance?: string;
  onLike?: () => void;
  onDislike?: () => void;
  onUndo?: () => void;
  undoDisabled?: boolean;
}

export const CardSwipe: React.FC<CarouselProps> = ({
  images,
  autoplayDelay = 1500,
  slideShadows = false,
  userName,
  userAge,
  userHobbies,
  userBio,
  userDistance,
  onLike,
  onDislike,
  onUndo,
  undoDisabled = true,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const css = `
    .swiper {
      width: 50%;
      padding-bottom: 50px;
    }
    
    .swiper-slide {
     display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    font-size: 22px;
    font-weight: bold;
    color: #fff;
    }
    
    .swiper-slide img {
      display: block;
      width: 100%;
    }
    
    `;
  return (
    <section className="w-ace-y-4">
      <style>{css}</style>
      <div className="mx-auto w-full max-w-4xl rounded-[24px] border border-black/5 p-2 shadow-sm md:rounded-t-[44px]">
        <div className="relative mx-auto flex w-full flex-col rounded-[24px] border border-black/5 bg-neutral-800/5 p-2 shadow-sm md:items-start md:gap-8 md:rounded-b-[20px] md:rounded-t-[40px] md:p-2">
          <div className="flex w-full items-center justify-center gap-4">
            <div className="w-full relative">
              <Swiper
                autoplay={{
                  delay: autoplayDelay,
                  disableOnInteraction: false,
                }}
                effect={"cards"}
                grabCursor={true}
                loop={true}
                slidesPerView={"auto"}
                rewind={true}
                cardsEffect={{
                  slideShadows: slideShadows,
                }}
                modules={[EffectCards, Autoplay, Pagination, Navigation]}
              >
                {images.map((image, index) => (
                  <SwiperSlide key={index}>
                    <div className="size-full rounded-3xl">
                      <img
                        src={image.src}
                        className="size-full rounded-xl"
                        alt={image.alt}
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>

          {/* User Info - Below Card Swipe */}
          {(userName || userAge) && (
            <div className="mt-2 px-4 pb-8">
              <div className="text-2xl font-bold text-gray-800 mb-3">
                {userName && <span>{userName}</span>}
                {userName && userAge && <span>, </span>}
                {userAge && <span>{userAge}</span>}
              </div>

              {/* Hobbies Pills */}
              {userHobbies && userHobbies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {userHobbies.slice(0, 3).map((hobby, index) => (
                    <span
                      key={index}
                      className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {hobby}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View More Button - Bottom Right */}
          {(userBio || userDistance) && (
            <div className="absolute bottom-4 right-4">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="bg-white p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 border border-gray-200"
                aria-label="View more details"
              >
                <ChevronDown
                  className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Like/Dislike Buttons - Outside Container */}
      <div className="relative -mt-8 flex justify-center">
        <div className="flex gap-4">
          <button
            onClick={onDislike}
            className="bg-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 border border-gray-200"
            aria-label="Dislike"
          >
            <X className="w-7 h-7 text-red-500" />
          </button>
          <button
            onClick={onUndo}
            disabled={undoDisabled}
            className="bg-white p-3 rounded-full shadow-xl hover:shadow-2xl hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-xl"
            aria-label="Undo"
          >
            <Undo2 className="w-5 h-5 text-amber-500" />
          </button>
          <button
            onClick={onLike}
            className="bg-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 border border-gray-200"
            aria-label="Like"
          >
            <Heart className="w-7 h-7 text-pink-500" />
          </button>
        </div>
      </div>

      {/* Expandable Details Section */}
      {(userBio || userDistance) && (
        <div
          className={`mx-auto w-full max-w-4xl transition-all duration-500 ease-in-out overflow-hidden ${
            isExpanded ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            {/* Bio Section */}
            {userBio && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  About
                </h3>
                <p className="text-gray-600 leading-relaxed">{userBio}</p>
              </div>
            )}

            {/* Distance Section */}
            {userDistance && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Location
                </h3>
                <p className="text-gray-600">{userDistance}</p>
              </div>
            )}

            {/* All Interests Section */}
            {userHobbies && userHobbies.length > 3 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  All Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {userHobbies.map((hobby, index) => (
                    <span
                      key={index}
                      className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {hobby}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
