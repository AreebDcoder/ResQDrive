import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

/**
 * Typed Redux hooks — use these everywhere instead of raw `useDispatch`/`useSelector`.
 *
 * Usage:
 *   const dispatch = useAppDispatch();
 *   const user = useAppSelector((state) => state.auth.user);
 *
 * This gives full TypeScript inference for action payloads + state shape.
 */

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
