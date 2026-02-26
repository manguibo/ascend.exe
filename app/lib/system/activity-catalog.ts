import type { BodyRegionId } from "./body-recovery";
import type { BodyTrainingProfile } from "./session-state";

export type ActivityDefinition = {
  id: string;
  label: string;
  codename: string;
  profile: Exclude<BodyTrainingProfile, "AUTO">;
  regionBias: Partial<Record<BodyRegionId, number>>;
};

type ActivitySeed = {
  id: string;
  label: string;
  codename: string;
  profile: Exclude<BodyTrainingProfile, "AUTO">;
  regionBias?: Partial<Record<BodyRegionId, number>>;
};

const profileBiasTemplates: Record<Exclude<BodyTrainingProfile, "AUTO">, Partial<Record<BodyRegionId, number>>> = {
  FULL: { CHEST: 0.16, BACK: 0.16, SHOULDERS: 0.14, ARMS: 0.14, CORE: 0.14, GLUTES: 0.1, QUADS: 0.08, HAMSTRINGS: 0.08 },
  PUSH: { CHEST: 0.26, BACK: 0.08, SHOULDERS: 0.22, ARMS: 0.17, CORE: 0.12, GLUTES: 0.05, QUADS: 0.05, HAMSTRINGS: 0.05 },
  PULL: { CHEST: 0.08, BACK: 0.27, SHOULDERS: 0.15, ARMS: 0.2, CORE: 0.13, GLUTES: 0.07, QUADS: 0.05, HAMSTRINGS: 0.1 },
  LOWER: { CHEST: 0.04, BACK: 0.1, SHOULDERS: 0.05, ARMS: 0.05, CORE: 0.14, GLUTES: 0.22, QUADS: 0.22, HAMSTRINGS: 0.18 },
  CONDITIONING: { CHEST: 0.07, BACK: 0.1, SHOULDERS: 0.09, ARMS: 0.08, CORE: 0.16, GLUTES: 0.16, QUADS: 0.18, HAMSTRINGS: 0.16 },
};

function defineActivity(seed: ActivitySeed): ActivityDefinition {
  return {
    id: seed.id,
    label: seed.label,
    codename: seed.codename,
    profile: seed.profile,
    regionBias: {
      ...profileBiasTemplates[seed.profile],
      ...seed.regionBias,
    },
  };
}

export const activityCatalog: readonly ActivityDefinition[] = [
  defineActivity({
    id: "WEIGHTLIFTING",
    label: "WEIGHTLIFTING",
    codename: "BARBELL STRENGTH BLOCK",
    profile: "FULL",
    regionBias: { CHEST: 0.2, BACK: 0.2, SHOULDERS: 0.18, ARMS: 0.15, CORE: 0.12, QUADS: 0.08, HAMSTRINGS: 0.07 },
  }),
  defineActivity({ id: "BODYBUILDING", label: "BODYBUILDING", codename: "HYPERTROPHY PHASE STACK", profile: "FULL" }),
  defineActivity({ id: "POWERLIFTING", label: "POWERLIFTING", codename: "MAX FORCE TRIAD", profile: "FULL", regionBias: { BACK: 0.2, CORE: 0.16, QUADS: 0.16, HAMSTRINGS: 0.14 } }),
  defineActivity({ id: "OLYMPIC_WEIGHTLIFTING", label: "OLYMPIC WEIGHTLIFTING", codename: "SNATCH CLEAN JERK CYCLE", profile: "FULL", regionBias: { SHOULDERS: 0.2, CORE: 0.16, QUADS: 0.14, GLUTES: 0.14 } }),
  defineActivity({ id: "CROSSFIT", label: "CROSSFIT", codename: "WORK CAPACITY MATRIX", profile: "FULL", regionBias: { CORE: 0.16, QUADS: 0.12, HAMSTRINGS: 0.11 } }),
  defineActivity({ id: "CALISTHENICS", label: "CALISTHENICS", codename: "BODYWEIGHT CONTROL BLOCK", profile: "FULL" }),
  defineActivity({ id: "HIIT", label: "HIIT", codename: "HIGH OUTPUT INTERVAL GRID", profile: "CONDITIONING", regionBias: { CORE: 0.18, QUADS: 0.2 } }),
  defineActivity({ id: "CIRCUIT_TRAINING", label: "CIRCUIT TRAINING", codename: "ROTATIONAL WORK CIRCUIT", profile: "FULL" }),
  defineActivity({ id: "BOOTCAMP", label: "BOOTCAMP", codename: "FIELD CONDITIONING BLOCK", profile: "CONDITIONING", regionBias: { CORE: 0.18 } }),

  defineActivity({ id: "BENCH_PRESS_SESSION", label: "BENCH PRESS SESSION", codename: "HORIZONTAL PRESS BLOCK", profile: "PUSH", regionBias: { CHEST: 0.32 } }),
  defineActivity({ id: "OVERHEAD_PRESS", label: "OVERHEAD PRESS", codename: "VERTICAL PRESS BLOCK", profile: "PUSH", regionBias: { SHOULDERS: 0.3, ARMS: 0.2 } }),
  defineActivity({ id: "PUSH_UPS", label: "PUSH UPS", codename: "BODYWEIGHT PRESS CHAIN", profile: "PUSH", regionBias: { CHEST: 0.28, CORE: 0.14 } }),
  defineActivity({ id: "DIPS", label: "DIPS", codename: "PARALLEL PRESS NODE", profile: "PUSH", regionBias: { CHEST: 0.24, ARMS: 0.22 } }),

  defineActivity({ id: "PULL_UPS", label: "PULL UPS", codename: "UPPER CHAIN ASCENT", profile: "PULL", regionBias: { BACK: 0.3, ARMS: 0.22 } }),
  defineActivity({ id: "ROWING_STRENGTH", label: "ROWING STRENGTH", codename: "HORIZONTAL PULL BLOCK", profile: "PULL", regionBias: { BACK: 0.32 } }),
  defineActivity({ id: "DEADLIFT_SESSION", label: "DEADLIFT SESSION", codename: "POSTERIOR CHAIN DRIVE", profile: "PULL", regionBias: { BACK: 0.24, GLUTES: 0.16, HAMSTRINGS: 0.14 } }),
  defineActivity({ id: "ROCK_CLIMBING", label: "ROCK CLIMBING", codename: "VERTICAL GRIP CIRCUIT", profile: "PULL", regionBias: { BACK: 0.32, ARMS: 0.28, SHOULDERS: 0.14, CORE: 0.12 } }),
  defineActivity({ id: "BOULDERING", label: "BOULDERING", codename: "GRIP POWER NODE", profile: "PULL", regionBias: { BACK: 0.27, ARMS: 0.3, CORE: 0.14 } }),

  defineActivity({ id: "SQUAT_SESSION", label: "SQUAT SESSION", codename: "KNEE DOMINANT LOAD", profile: "LOWER", regionBias: { QUADS: 0.3, GLUTES: 0.24 } }),
  defineActivity({ id: "LUNGES", label: "LUNGES", codename: "UNILATERAL LEG VECTOR", profile: "LOWER", regionBias: { QUADS: 0.26, GLUTES: 0.22, HAMSTRINGS: 0.18 } }),
  defineActivity({ id: "LEG_PRESS", label: "LEG PRESS", codename: "LINEAR LEG DRIVE", profile: "LOWER", regionBias: { QUADS: 0.3, GLUTES: 0.2 } }),
  defineActivity({ id: "KETTLEBELL_TRAINING", label: "KETTLEBELL TRAINING", codename: "SWING POWER LOOP", profile: "LOWER", regionBias: { GLUTES: 0.24, HAMSTRINGS: 0.2, CORE: 0.16 } }),
  defineActivity({ id: "PLYOMETRICS", label: "PLYOMETRICS", codename: "EXPLOSIVE GROUND CONTACT", profile: "LOWER", regionBias: { QUADS: 0.24, HAMSTRINGS: 0.2, GLUTES: 0.2 } }),

  defineActivity({ id: "RUNNING", label: "RUNNING", codename: "AEROBIC STRIDE CYCLE", profile: "CONDITIONING", regionBias: { QUADS: 0.3, HAMSTRINGS: 0.28, GLUTES: 0.2, CORE: 0.14 } }),
  defineActivity({ id: "WALKING", label: "WALKING", codename: "LOW IMPACT PATROL", profile: "CONDITIONING", regionBias: { QUADS: 0.18, HAMSTRINGS: 0.16, GLUTES: 0.16, CORE: 0.14 } }),
  defineActivity({ id: "HIKING", label: "HIKING", codename: "ELEVATION TREK MODULE", profile: "CONDITIONING", regionBias: { QUADS: 0.24, HAMSTRINGS: 0.22, GLUTES: 0.2, CORE: 0.14 } }),
  defineActivity({ id: "TRAIL_RUNNING", label: "TRAIL RUNNING", codename: "VARIABLE TERRAIN STRIDE", profile: "CONDITIONING", regionBias: { QUADS: 0.26, HAMSTRINGS: 0.24, GLUTES: 0.2, CORE: 0.16 } }),
  defineActivity({ id: "SPRINTING", label: "SPRINTING", codename: "ANAEROBIC BURST LINE", profile: "CONDITIONING", regionBias: { QUADS: 0.28, HAMSTRINGS: 0.26, GLUTES: 0.22 } }),
  defineActivity({ id: "JUMP_ROPE", label: "JUMP ROPE", codename: "RHYTHM FOOTWORK LOOP", profile: "CONDITIONING", regionBias: { QUADS: 0.22, HAMSTRINGS: 0.2, GLUTES: 0.16 } }),

  defineActivity({ id: "CYCLING", label: "CYCLING", codename: "PEDAL OUTPUT CHAIN", profile: "CONDITIONING", regionBias: { QUADS: 0.3, GLUTES: 0.2, HAMSTRINGS: 0.18, CORE: 0.14 } }),
  defineActivity({ id: "SPIN_CLASS", label: "SPIN CLASS", codename: "INDOOR BIKE ASSAULT", profile: "CONDITIONING", regionBias: { QUADS: 0.3, GLUTES: 0.2, CORE: 0.14 } }),
  defineActivity({ id: "MOUNTAIN_BIKING", label: "MOUNTAIN BIKING", codename: "TECHNICAL RIDING CIRCUIT", profile: "CONDITIONING", regionBias: { QUADS: 0.24, GLUTES: 0.2, CORE: 0.18, SHOULDERS: 0.12 } }),

  defineActivity({ id: "SWIMMING", label: "SWIMMING", codename: "AQUATIC PROPULSION LOOP", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.2, BACK: 0.2, ARMS: 0.16, CORE: 0.16, QUADS: 0.12 } }),
  defineActivity({ id: "ROWING_ERG", label: "ROWING ERG", codename: "ROW ENGINE BLOCK", profile: "CONDITIONING", regionBias: { BACK: 0.24, QUADS: 0.2, HAMSTRINGS: 0.18, CORE: 0.16, ARMS: 0.14 } }),
  defineActivity({ id: "ELLIPTICAL", label: "ELLIPTICAL", codename: "LOW IMPACT ENGINE", profile: "CONDITIONING", regionBias: { QUADS: 0.2, GLUTES: 0.18, CORE: 0.15 } }),
  defineActivity({ id: "STAIR_CLIMBER", label: "STAIR CLIMBER", codename: "VERTICAL STEP LOAD", profile: "CONDITIONING", regionBias: { QUADS: 0.28, GLUTES: 0.24, HAMSTRINGS: 0.2 } }),

  defineActivity({ id: "YOGA", label: "YOGA", codename: "MOBILITY STABILITY FLOW", profile: "CONDITIONING", regionBias: { CORE: 0.2, SHOULDERS: 0.14, GLUTES: 0.14, HAMSTRINGS: 0.14 } }),
  defineActivity({ id: "PILATES", label: "PILATES", codename: "CORE CONTROL PROTOCOL", profile: "CONDITIONING", regionBias: { CORE: 0.28, GLUTES: 0.16, SHOULDERS: 0.12 } }),
  defineActivity({ id: "MOBILITY_WORK", label: "MOBILITY WORK", codename: "RANGE RESTORE BLOCK", profile: "CONDITIONING", regionBias: { CORE: 0.16, SHOULDERS: 0.14, HAMSTRINGS: 0.14, GLUTES: 0.14 } }),

  defineActivity({ id: "BASKETBALL", label: "BASKETBALL", codename: "COURT TRANSITION DRIVE", profile: "CONDITIONING", regionBias: { QUADS: 0.24, HAMSTRINGS: 0.2, GLUTES: 0.18, CORE: 0.14, SHOULDERS: 0.12 } }),
  defineActivity({ id: "SOCCER", label: "SOCCER", codename: "FIELD ENGINE RUN", profile: "CONDITIONING", regionBias: { QUADS: 0.28, HAMSTRINGS: 0.24, GLUTES: 0.2, CORE: 0.14 } }),
  defineActivity({ id: "FOOTBALL", label: "FOOTBALL", codename: "CONTACT BURST PROTOCOL", profile: "FULL", regionBias: { QUADS: 0.2, GLUTES: 0.16, SHOULDERS: 0.16, CHEST: 0.14 } }),
  defineActivity({ id: "RUGBY", label: "RUGBY", codename: "IMPACT ENDURANCE GRID", profile: "FULL", regionBias: { QUADS: 0.2, HAMSTRINGS: 0.16, SHOULDERS: 0.16, BACK: 0.16 } }),
  defineActivity({ id: "BASEBALL", label: "BASEBALL", codename: "ROTATIONAL THROW CYCLE", profile: "FULL", regionBias: { SHOULDERS: 0.2, ARMS: 0.18, CORE: 0.18 } }),
  defineActivity({ id: "SOFTBALL", label: "SOFTBALL", codename: "FIELD THROW CHAIN", profile: "FULL", regionBias: { SHOULDERS: 0.2, ARMS: 0.18, CORE: 0.18 } }),
  defineActivity({ id: "TENNIS", label: "TENNIS", codename: "RACKET AGILITY LOOP", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.18, ARMS: 0.18, CORE: 0.16, QUADS: 0.18 } }),
  defineActivity({ id: "PICKLEBALL", label: "PICKLEBALL", codename: "COURT REACTION NODE", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.14, ARMS: 0.14, CORE: 0.15, QUADS: 0.2 } }),
  defineActivity({ id: "BADMINTON", label: "BADMINTON", codename: "SHUTTLE FOOTWORK GRID", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.16, ARMS: 0.14, CORE: 0.16, QUADS: 0.2 } }),
  defineActivity({ id: "VOLLEYBALL", label: "VOLLEYBALL", codename: "VERTICAL SPIKE BLOCK", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.2, ARMS: 0.16, CORE: 0.14, QUADS: 0.2 } }),
  defineActivity({ id: "TABLE_TENNIS", label: "TABLE TENNIS", codename: "MICRO REACTION CIRCUIT", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.14, ARMS: 0.16, CORE: 0.14, QUADS: 0.16 } }),
  defineActivity({ id: "GOLF", label: "GOLF", codename: "ROTATIONAL SWING SEQUENCE", profile: "CONDITIONING", regionBias: { CORE: 0.22, SHOULDERS: 0.16, BACK: 0.16, ARMS: 0.14 } }),

  defineActivity({ id: "MARTIAL_ARTS", label: "MARTIAL ARTS", codename: "STRIKE CONTROL MATRIX", profile: "FULL", regionBias: { SHOULDERS: 0.18, CORE: 0.18, QUADS: 0.16, HAMSTRINGS: 0.14 } }),
  defineActivity({ id: "BOXING", label: "BOXING", codename: "COMBAT OUTPUT NODE", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.2, ARMS: 0.2, CORE: 0.18, QUADS: 0.14 } }),
  defineActivity({ id: "KICKBOXING", label: "KICKBOXING", codename: "STRIKE RANGE GRID", profile: "FULL", regionBias: { SHOULDERS: 0.16, ARMS: 0.15, CORE: 0.18, QUADS: 0.18, HAMSTRINGS: 0.14 } }),
  defineActivity({ id: "MUAY_THAI", label: "MUAY THAI", codename: "CLINCH STRIKE ENGINE", profile: "FULL", regionBias: { SHOULDERS: 0.16, ARMS: 0.14, CORE: 0.2, QUADS: 0.18, HAMSTRINGS: 0.14 } }),
  defineActivity({ id: "MMA", label: "MMA", codename: "MIXED COMBAT SYSTEM", profile: "FULL", regionBias: { BACK: 0.16, SHOULDERS: 0.16, ARMS: 0.16, CORE: 0.18, QUADS: 0.16, HAMSTRINGS: 0.12 } }),
  defineActivity({ id: "WRESTLING", label: "WRESTLING", codename: "GRAPPLING PRESSURE LOOP", profile: "FULL", regionBias: { BACK: 0.2, ARMS: 0.18, CORE: 0.18, QUADS: 0.16 } }),
  defineActivity({ id: "BRAZILIAN_JIU_JITSU", label: "BRAZILIAN JIU JITSU", codename: "GROUND CONTROL STACK", profile: "FULL", regionBias: { BACK: 0.18, ARMS: 0.18, CORE: 0.2, GLUTES: 0.14 } }),

  defineActivity({ id: "SKIING", label: "SKIING", codename: "SLOPE STABILITY DRIVE", profile: "CONDITIONING", regionBias: { QUADS: 0.26, GLUTES: 0.2, CORE: 0.16 } }),
  defineActivity({ id: "SNOWBOARDING", label: "SNOWBOARDING", codename: "EDGE CONTROL VECTOR", profile: "CONDITIONING", regionBias: { QUADS: 0.24, HAMSTRINGS: 0.2, CORE: 0.18 } }),
  defineActivity({ id: "SKATEBOARDING", label: "SKATEBOARDING", codename: "BOARD BALANCE NODE", profile: "CONDITIONING", regionBias: { QUADS: 0.2, HAMSTRINGS: 0.16, CORE: 0.18, GLUTES: 0.16 } }),
  defineActivity({ id: "SURFING", label: "SURFING", codename: "WAVE STABILITY LOOP", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.16, BACK: 0.16, CORE: 0.2, GLUTES: 0.14 } }),
  defineActivity({ id: "PADDLEBOARDING", label: "PADDLEBOARDING", codename: "WATER BALANCE CIRCUIT", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.16, BACK: 0.16, CORE: 0.22 } }),
  defineActivity({ id: "KAYAKING", label: "KAYAKING", codename: "PADDLE POWER CHAIN", profile: "PULL", regionBias: { BACK: 0.24, SHOULDERS: 0.2, ARMS: 0.18, CORE: 0.16 } }),
  defineActivity({ id: "CANOEING", label: "CANOEING", codename: "STROKE ENDURANCE BLOCK", profile: "PULL", regionBias: { BACK: 0.24, SHOULDERS: 0.2, ARMS: 0.18, CORE: 0.16 } }),

  defineActivity({ id: "DANCE", label: "DANCE", codename: "RHYTHM MOVEMENT SYSTEM", profile: "CONDITIONING", regionBias: { CORE: 0.18, GLUTES: 0.18, QUADS: 0.18, HAMSTRINGS: 0.16 } }),
  defineActivity({ id: "ZUMBA", label: "ZUMBA", codename: "CARDIO RHYTHM LOOP", profile: "CONDITIONING", regionBias: { CORE: 0.16, GLUTES: 0.18, QUADS: 0.2 } }),
  defineActivity({ id: "AEROBICS", label: "AEROBICS", codename: "SUSTAINED MOTION BLOCK", profile: "CONDITIONING", regionBias: { CORE: 0.16, QUADS: 0.2, HAMSTRINGS: 0.18 } }),

  defineActivity({ id: "ICE_HOCKEY", label: "ICE HOCKEY", codename: "ICE SHIFT BURST", profile: "CONDITIONING", regionBias: { QUADS: 0.24, GLUTES: 0.2, CORE: 0.16, SHOULDERS: 0.14 } }),
  defineActivity({ id: "LACROSSE", label: "LACROSSE", codename: "FIELD STICK TRANSITION", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.16, ARMS: 0.14, CORE: 0.16, QUADS: 0.2 } }),
  defineActivity({ id: "HANDBALL", label: "HANDBALL", codename: "COURT THROW VECTOR", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.18, ARMS: 0.16, CORE: 0.16, QUADS: 0.18 } }),
  defineActivity({ id: "CRICKET", label: "CRICKET", codename: "FIELD ROTATION STACK", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.16, ARMS: 0.14, CORE: 0.18, QUADS: 0.16 } }),
  defineActivity({ id: "FIELD_HOCKEY", label: "FIELD HOCKEY", codename: "STICKWORK SPRINT GRID", profile: "CONDITIONING", regionBias: { CORE: 0.16, QUADS: 0.22, HAMSTRINGS: 0.18 } }),
  defineActivity({ id: "ULTIMATE_FRISBEE", label: "ULTIMATE FRISBEE", codename: "DISC TRANSITION RUN", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.14, CORE: 0.16, QUADS: 0.22, HAMSTRINGS: 0.18 } }),

  defineActivity({ id: "TRIATHLON", label: "TRIATHLON", codename: "MULTI DISCIPLINE ENDURANCE", profile: "CONDITIONING", regionBias: { SHOULDERS: 0.14, BACK: 0.14, CORE: 0.16, GLUTES: 0.16, QUADS: 0.18, HAMSTRINGS: 0.16 } }),
  defineActivity({ id: "OBSTACLE_RACING", label: "OBSTACLE RACING", codename: "OBSTACLE ASSAULT COURSE", profile: "FULL", regionBias: { BACK: 0.18, SHOULDERS: 0.18, ARMS: 0.16, CORE: 0.18, QUADS: 0.14 } }),
  defineActivity({ id: "RUCKING", label: "RUCKING", codename: "LOAD BEARING MARCH", profile: "CONDITIONING", regionBias: { BACK: 0.18, CORE: 0.18, GLUTES: 0.18, QUADS: 0.2, HAMSTRINGS: 0.16 } }),
  defineActivity({ id: "STAIR_RUNNING", label: "STAIR RUNNING", codename: "VERTICAL ENGINE PUSH", profile: "CONDITIONING", regionBias: { QUADS: 0.3, GLUTES: 0.24, HAMSTRINGS: 0.2 } }),
  defineActivity({ id: "SPEED_SKATING", label: "SPEED SKATING", codename: "GLIDE POWER CYCLE", profile: "CONDITIONING", regionBias: { GLUTES: 0.22, QUADS: 0.24, HAMSTRINGS: 0.2, CORE: 0.16 } }),
  defineActivity({ id: "ROLLERBLADING", label: "ROLLERBLADING", codename: "INLINE DRIVE PATH", profile: "CONDITIONING", regionBias: { GLUTES: 0.2, QUADS: 0.22, HAMSTRINGS: 0.18, CORE: 0.16 } }),
];

const activityAliasIndex: Partial<Record<ActivityDefinition["id"], readonly string[]>> = {
  WEIGHTLIFTING: ["GYM", "LIFTING", "WEIGHTS", "STRENGTH TRAINING"],
  BODYBUILDING: ["HYPERTROPHY", "MUSCLE BUILDING"],
  POWERLIFTING: ["SBD", "SQUAT BENCH DEADLIFT"],
  OLYMPIC_WEIGHTLIFTING: ["OLY LIFTING", "SNATCH", "CLEAN AND JERK"],
  CROSSFIT: ["WOD", "FUNCTIONAL FITNESS"],
  CALISTHENICS: ["BODYWEIGHT", "STREET WORKOUT"],
  HIIT: ["INTERVALS", "HIGH INTENSITY INTERVAL TRAINING"],
  BENCH_PRESS_SESSION: ["BENCH", "CHEST PRESS"],
  OVERHEAD_PRESS: ["OHP", "SHOULDER PRESS"],
  PUSH_UPS: ["PUSHUPS", "PRESSUPS"],
  PULL_UPS: ["PULLUPS", "CHIN UPS", "CHINUPS"],
  DEADLIFT_SESSION: ["DEADLIFT", "HIP HINGE"],
  ROCK_CLIMBING: ["CLIMBING", "SPORT CLIMBING"],
  SQUAT_SESSION: ["SQUAT", "BACK SQUAT", "FRONT SQUAT"],
  KETTLEBELL_TRAINING: ["KETTLEBELLS", "KB TRAINING"],
  RUNNING: ["JOGGING", "JOG", "ROAD RUNNING"],
  WALKING: ["WALK", "POWER WALKING", "BRISK WALK"],
  HIKING: ["TREKKING"],
  CYCLING: ["BIKING", "ROAD CYCLING", "BIKE RIDE"],
  SPIN_CLASS: ["SPINNING", "INDOOR CYCLING"],
  MOUNTAIN_BIKING: ["MTB", "TRAIL BIKING"],
  SWIMMING: ["LAP SWIMMING", "POOL SWIM"],
  ROWING_ERG: ["ERG", "ERG ROWING", "ROWING MACHINE"],
  STAIR_CLIMBER: ["STEPMILL", "STAIRMASTER"],
  YOGA: ["ASANA", "VINYASA", "HATHA YOGA"],
  PILATES: ["MAT PILATES", "REFORMER PILATES"],
  MOBILITY_WORK: ["STRETCHING", "MOBILITY", "FLEXIBILITY"],
  BASKETBALL: ["HOOPS"],
  SOCCER: ["FOOTBALL SOCCER", "FUTBOL"],
  FOOTBALL: ["AMERICAN FOOTBALL", "GRIDIRON"],
  TENNIS: ["LAWN TENNIS"],
  TABLE_TENNIS: ["PING PONG", "PINGPONG"],
  MARTIAL_ARTS: ["KARATE", "TAEKWONDO", "KUNG FU"],
  BOXING: ["SPARRING", "HEAVY BAG"],
  KICKBOXING: ["CARDIO KICKBOXING"],
  MUAY_THAI: ["THAI BOXING"],
  MMA: ["MIXED MARTIAL ARTS"],
  BRAZILIAN_JIU_JITSU: ["BJJ", "JIU JITSU"],
  SKIING: ["ALPINE SKIING", "DOWNHILL SKIING"],
  SURFING: ["WAVE RIDING"],
  KAYAKING: ["KAYAK"],
  DANCE: ["DANCING"],
  ZUMBA: ["DANCE FITNESS"],
  AEROBICS: ["AEROBIC CLASS"],
  ICE_HOCKEY: ["HOCKEY"],
  TRIATHLON: ["TRI"],
  OBSTACLE_RACING: ["OCR", "SPARTAN RACE", "MUD RUN"],
  RUCKING: ["RUCK", "LOADED MARCH"],
  ROLLERBLADING: ["INLINE SKATING", "ROLLER SKATING"],
};

export function getActivitySearchTerms(activity: ActivityDefinition): readonly string[] {
  const aliases = activityAliasIndex[activity.id] ?? [];
  return [activity.label, activity.id, activity.codename, ...aliases];
}

export const defaultActivityDefinition = activityCatalog[0];

export function getActivityDefinition(id: string): ActivityDefinition {
  return activityCatalog.find((activity) => activity.id === id) ?? defaultActivityDefinition;
}
