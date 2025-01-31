'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSliderProps {
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  gap?: number;
}

const BOUNCE_FACTOR = 0.3; // 튕김 효과의 강도를 설정 (0.1 ~ 0.5 사이)

export function useSlider<T extends HTMLElement>({
  isDragging,
  setIsDragging,
  gap = 16,
}: UseSliderProps) {
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [prevTranslate, setPrevTranslate] = useState(0);
  const [maxTranslate, setMaxTranslate] = useState(0);

  const trackRef = useRef<T>(null);
  const isMouseDownRef = useRef(false); // 클릭 상태 추적용 ref
  const diffRef = useRef(0);
  const startPosRef = useRef(0);
  const isInputClickRef = useRef(false);

  const calculateDiff = useCallback(
    (
      e:
        | MouseEvent
        | TouchEvent
        | React.MouseEvent<HTMLDivElement>
        | React.TouchEvent<HTMLDivElement>,
    ) => {
      // if (!isMouseDownRef.current) return;
      const currentPosition = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      diffRef.current = currentPosition - startPosRef.current;
    },
    [],
  );

  const translate = useCallback(() => {
    if (!trackRef.current) return;
    let nextTranslate = prevTranslate + diffRef.current;

    // 좌우 끝에 도달했을 때 탄성 효과 적용
    if (nextTranslate > 0) {
      nextTranslate *= BOUNCE_FACTOR; // 왼쪽 끝에서 튕김 효과
    } else if (nextTranslate < maxTranslate) {
      nextTranslate = maxTranslate + (nextTranslate - maxTranslate) * BOUNCE_FACTOR; // 오른쪽 끝에서 튕김 효과
    }
    setCurrentTranslate(nextTranslate);
  }, [setCurrentTranslate, maxTranslate, prevTranslate]);

  const handleMouseDownTouchStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    isMouseDownRef.current = true;
    if ('clientX' in e) {
      startPosRef.current = e.clientX;
    } else {
      startPosRef.current = e.touches[0].clientX;
    }
  };

  const handleMouseMoveTouchMove = useCallback(
    (
      e:
        | MouseEvent
        | React.MouseEvent<HTMLDivElement>
        | TouchEvent
        | React.TouchEvent<HTMLDivElement>,
    ) => {
      if (!trackRef.current) return;
      calculateDiff(e);
      if (isMouseDownRef.current && diffRef.current !== 0) {
        setIsDragging(true);
        translate();
      }
    },
    [translate, setIsDragging, calculateDiff],
  );

  const handleMouseUpTouchEnd = useCallback(
    (
      e:
        | MouseEvent
        | React.MouseEvent<HTMLDivElement>
        | React.TouchEvent<HTMLDivElement>
        | TouchEvent,
    ) => {
      isMouseDownRef.current = false;
      const target = e.target as HTMLElement;
      if (!isDragging && target.closest('.layout-key')) {
        isInputClickRef.current = true;
      } else {
        isInputClickRef.current = false;
      }
      if (!trackRef.current) return;
      // 드래깅이 끝나면 현재 위치가 범위를 넘었을 경우 제자리로 돌아오게 설정
      if (currentTranslate > 0) {
        setCurrentTranslate(0); // 왼쪽 끝으로 돌아가기
      } else if (currentTranslate < maxTranslate) {
        setCurrentTranslate(maxTranslate); // 오른쪽 끝으로 돌아가기
      }
      trackRef.current.style.transition = 'transform 0.3s ease-out';

      // 애니메이션이 끝나면 트랜지션 초기화
      setTimeout(() => {
        if (!trackRef.current) return;
        trackRef.current.style.transition = '';
      }, 300);

      if (trackRef.current.contains(e.target as HTMLElement)) {
        setIsDragging(false);
      } else {
        // 멀티모달일 경우에 자꾸 꺼지는 이슈가 있어서 리턴처리
        if (target.closest('#multi-modal-bg') || target.closest('#multi-modal-inner-bg')) {
          setPrevTranslate(currentTranslate);
          return;
        }
        setTimeout(() => {
          setIsDragging(false);
        }, 0);
      }

      setPrevTranslate(currentTranslate);
    },
    [currentTranslate, handleMouseMoveTouchMove, setIsDragging, maxTranslate, isDragging],
  );

  const handleInputClick = useCallback(
    <T>(setState: Dispatch<SetStateAction<T>>, option: Partial<T>) =>
      () => {
        if (isDragging) return;
        if (isInputClickRef.current) setState((prev) => ({ ...prev, ...option }));
      },
    [isDragging],
  );

  const handleScrollToIndex = useCallback(
    (index: number) => {
      if (!trackRef.current) return;

      const slides = trackRef.current.children;
      if (slides.length === 0 || index < 0 || index >= slides.length) return;

      // 각 슬라이드의 너비 및 간격 계산
      const gapWidth = gap;
      const translateX = Array.from(slides)
        .slice(0, index)
        .reduce((acc, slide) => acc - (slide.getBoundingClientRect().width + gapWidth), 0);

      setCurrentTranslate(translateX);
      setPrevTranslate(translateX);

      // 트랜지션 효과 추가
      trackRef.current.style.transition = 'transform 0.3s ease-out';
      trackRef.current.style.transform = `translate3d(${translateX}px, 0, 0)`;

      // 트랜지션 초기화
      setTimeout(() => {
        if (trackRef.current) {
          trackRef.current.style.transition = '';
        }
      }, 300);
    },
    [gap],
  );

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${currentTranslate}px, 0, 0)`;
    }
  }, [currentTranslate]);

  useEffect(() => {
    if (isDragging) {
      // 전역 이벤트 추가
      window.addEventListener('mousemove', handleMouseMoveTouchMove);
      window.addEventListener('mouseup', handleMouseUpTouchEnd);
      window.addEventListener('touchmove', handleMouseMoveTouchMove);
      window.addEventListener('touchend', handleMouseUpTouchEnd);
    }

    return () => {
      // 이벤트 정리
      window.removeEventListener('mousemove', handleMouseMoveTouchMove);
      window.removeEventListener('mouseup', handleMouseUpTouchEnd);
      window.removeEventListener('touchmove', handleMouseMoveTouchMove);
      window.removeEventListener('touchend', handleMouseUpTouchEnd);
    };
  }, [isDragging, handleMouseMoveTouchMove, handleMouseUpTouchEnd]);

  useEffect(() => {
    if (trackRef.current) {
      const slides = trackRef.current.children;
      if (slides.length > 0) {
        const tracksWidth = Array.from(slides).reduce((acc, slide) => {
          const slideWidth = slide.getBoundingClientRect().width;
          return acc + slideWidth;
        }, 0);
        const gapWidth = gap * (slides.length - 1);
        const containerWidth = trackRef.current.offsetWidth; // 컨테이너 너비
        setMaxTranslate(-(tracksWidth + gapWidth - containerWidth)); // 최대 이동 가능 범위 계산
      }
    }
  }, []);

  return {
    isDragging,
    trackRef,
    handleMouseDownTouchStart,
    handleMouseMoveTouchMove,
    handleMouseUpTouchEnd,
    handleInputClick,
    handleScrollToIndex,
  };
}
