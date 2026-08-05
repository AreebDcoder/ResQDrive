import { Test, TestingModule } from '@nestjs/testing';
import { EmergencySosOrchestrator } from '../emergency-sos.orchestrator';
import { EmergencySosService } from '../emergency-sos.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('EmergencySosOrchestrator', () => {
  let orchestrator: EmergencySosOrchestrator;
  let mockPrismaService: any;
  let mockSosService: any;

  beforeEach(async () => {
    mockPrismaService = {
      incident: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'incident-123',
          latitude: 33.6844,
          longitude: 73.0479,
        }),
      },
    };

    mockSosService = {
      getNumbersForLocation: jest.fn().mockResolvedValue({
        regionalNumbers: [{ serviceName: 'Rescue 1122' }],
      }),
      logCall: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencySosOrchestrator,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmergencySosService, useValue: mockSosService },
      ],
    }).compile();

    orchestrator = module.get<EmergencySosOrchestrator>(EmergencySosOrchestrator);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should trigger call when timer expires with no cancellation', async () => {
    jest.useFakeTimers();
    const callback = jest.fn().mockResolvedValue(undefined);
    orchestrator.setOnTriggerCall(callback);

    orchestrator.startEscalationTimer('user-123', 'incident-123', 1000);

    expect(orchestrator.hasActiveTimer('incident-123')).toBe(true);

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    // Allow promise ticks to resolve async tasks inside timeout handler
    await new Promise(jest.requireActual('timers').setImmediate);

    expect(orchestrator.hasActiveTimer('incident-123')).toBe(false);
    expect(callback).toHaveBeenCalledWith('incident-123', 'Rescue 1122');
    expect(mockSosService.logCall).toHaveBeenCalledWith('user-123', 'Rescue 1122', true);
  });

  it('should not trigger call if timer is cancelled before expiry', async () => {
    jest.useFakeTimers();
    const callback = jest.fn().mockResolvedValue(undefined);
    orchestrator.setOnTriggerCall(callback);

    orchestrator.startEscalationTimer('user-123', 'incident-123', 1000);
    expect(orchestrator.hasActiveTimer('incident-123')).toBe(true);

    // Cancel timer early
    orchestrator.cancelEscalationTimer('incident-123');
    expect(orchestrator.hasActiveTimer('incident-123')).toBe(false);

    // Fast-forward time
    jest.advanceTimersByTime(1000);
    await new Promise(jest.requireActual('timers').setImmediate);

    expect(callback).not.toHaveBeenCalled();
    expect(mockSosService.logCall).not.toHaveBeenCalled();
  });

  it('should not start duplicate timers on multiple rapid start calls', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(global, 'setTimeout');

    orchestrator.startEscalationTimer('user-123', 'incident-123', 1000);
    orchestrator.startEscalationTimer('user-123', 'incident-123', 1000);

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
