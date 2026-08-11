import { MultiModalFusionService, ConfirmedAccidentTrigger } from '../multiModalFusionService';

describe('MultiModalFusionService (10-Second Coincidence Window)', () => {
  beforeEach(() => {
    MultiModalFusionService.reset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should NOT trigger callback on acoustic sound event alone', () => {
    const callback = jest.fn();
    MultiModalFusionService.subscribeToConfirmedAccidents(callback);

    MultiModalFusionService.recordSoundEvent(0.85, 'Explosion');

    expect(callback).not.toHaveBeenCalled();
  });

  it('should NOT trigger callback on motion sensor event alone', () => {
    const callback = jest.fn();
    MultiModalFusionService.subscribeToConfirmedAccidents(callback);

    MultiModalFusionService.recordMotionEvent('severe', 4.8, 260);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should TRIGGER callback when sound event is followed by motion event within 10 seconds', () => {
    const callback = jest.fn();
    MultiModalFusionService.subscribeToConfirmedAccidents(callback);

    // Sound detected at t = 0s
    MultiModalFusionService.recordSoundEvent(0.70, 'Crash');
    expect(callback).not.toHaveBeenCalled();

    // Advance 4 seconds
    jest.advanceTimersByTime(4000);

    // Motion detected at t = 4s (within 10s window)
    MultiModalFusionService.recordMotionEvent('moderate', 3.8, 160);

    expect(callback).toHaveBeenCalledTimes(1);
    const trigger: ConfirmedAccidentTrigger = callback.mock.calls[0][0];
    expect(trigger.soundEvent.topClass).toBe('Crash');
    expect(trigger.motionEvent.severity).toBe('moderate');
  });

  it('should TRIGGER callback when motion event is followed by sound event within 10 seconds', () => {
    const callback = jest.fn();
    MultiModalFusionService.subscribeToConfirmedAccidents(callback);

    // Motion detected at t = 0s
    MultiModalFusionService.recordMotionEvent('severe', 4.6, 255);
    expect(callback).not.toHaveBeenCalled();

    // Advance 6 seconds
    jest.advanceTimersByTime(6000);

    // Sound detected at t = 6s (within 10s window)
    MultiModalFusionService.recordSoundEvent(0.80, 'Glass');

    expect(callback).toHaveBeenCalledTimes(1);
    const trigger: ConfirmedAccidentTrigger = callback.mock.calls[0][0];
    expect(trigger.combinedSeverity).toBe('Severe');
  });

  it('should NOT trigger callback if sound and motion occur more than 10 seconds apart', () => {
    const callback = jest.fn();
    MultiModalFusionService.subscribeToConfirmedAccidents(callback);

    // Sound detected at t = 0s
    MultiModalFusionService.recordSoundEvent(0.70, 'Explosion');

    // Advance 12 seconds (window expires)
    jest.advanceTimersByTime(12000);

    // Motion detected at t = 12s
    MultiModalFusionService.recordMotionEvent('moderate', 3.6, 150);

    expect(callback).not.toHaveBeenCalled();
  });
});
