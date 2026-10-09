import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, date
from app.database import get_database
from app.models.mastery_game import (
    SkillProgressNode,
    SkillBreakdown,
    SkillEvolutionStage,
    MasteryQuest,
    QuestStage,
    QuestEvaluationResult,
    BossChallenge,
    BossChallengeScenario,
    MasteryAchievement,
    LearnerMasteryProfile,
    SkillUniverseResponse
)

logger = logging.getLogger("neuroquest.mastery_game")

# --------------------------------------------------------------------------
# CANONICAL JAVA/PROGRAMMING SKILL UNIVERSE GRAPH
# --------------------------------------------------------------------------
SKILL_GRAPH_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "fundamentals": {
        "title": "Java Fundamentals",
        "description": "Variables, primitive data types, memory representations, and control flow loops.",
        "prerequisites": [],
        "threshold": 0.70,
        "default_breakdown": {"concept_understanding": 0.0, "recall": 0.0, "application": 0.0, "independent_problem_solving": 0.0}
    },
    "methods": {
        "title": "Methods & Functions",
        "description": "Method signatures, return types, parameter passing by value, and scope boundaries.",
        "prerequisites": ["fundamentals"],
        "threshold": 0.70,
        "default_breakdown": {"concept_understanding": 0.0, "recall": 0.0, "application": 0.0, "independent_problem_solving": 0.0}
    },
    "oop_basics": {
        "title": "OOP Basics: Classes & Objects",
        "description": "Classes as blueprints, instance state encapsulation, constructors, and references.",
        "prerequisites": ["fundamentals", "methods"],
        "threshold": 0.70,
        "default_breakdown": {"concept_understanding": 0.0, "recall": 0.0, "application": 0.0, "independent_problem_solving": 0.0}
    },
    "inheritance": {
        "title": "Inheritance & Subclassing",
        "description": "Class hierarchies, extends keyword, method overriding, super calls, and reuse.",
        "prerequisites": ["oop_basics"],
        "threshold": 0.70,
        "default_breakdown": {"concept_understanding": 0.0, "recall": 0.0, "application": 0.0, "independent_problem_solving": 0.0}
    },
    "polymorphism": {
        "title": "Polymorphism & Dynamic Dispatch",
        "description": "Runtime dispatch, interface contracts, upcasting, and polymorphic collections.",
        "prerequisites": ["inheritance"],
        "threshold": 0.70,
        "default_breakdown": {"concept_understanding": 0.0, "recall": 0.0, "application": 0.0, "independent_problem_solving": 0.0}
    },
    "collections": {
        "title": "Collections & Data Structures",
        "description": "List implementations, ArrayList vs LinkedList, iteration, and generics.",
        "prerequisites": ["oop_basics", "inheritance"],
        "threshold": 0.70,
        "default_breakdown": {"concept_understanding": 0.0, "recall": 0.0, "application": 0.0, "independent_problem_solving": 0.0}
    }
}

# --------------------------------------------------------------------------
# CURATED 5-STAGE QUESTS (LEARN -> IDENTIFY -> APPLY -> CHALLENGE -> DEMONSTRATE)
# --------------------------------------------------------------------------
MASTER_QUESTS: Dict[str, MasteryQuest] = {
    "quest_fundamentals": MasteryQuest(
        id="quest_fundamentals",
        skill_id="fundamentals",
        title="Master Java Fundamentals",
        description="Build rock-solid mastery of variables, types, and loops that power all Java systems.",
        difficulty="beginner",
        target_mastery=0.70,
        estimated_minutes=6,
        reward_xp=80,
        stages=[
            QuestStage(
                stage_number=1,
                stage_type="understand",
                title="🧠 Stage 1: Understand Variables & Primitive Storage",
                prompt="In Java, primitive variables directly store raw binary values in stack memory, whereas reference variables hold the address pointing to an object in heap memory.",
                code_snippet="int score = 42;\ndouble velocity = 9.81;\nboolean isEngineReady = true;",
                options=["Primitives store values directly; references store memory addresses", "All variables in Java automatically turn into text", "Variables only exist on the hard drive", "Variables cannot change once declared"],
                correct_answer="Primitives store values directly; references store memory addresses",
                explanation="Java primitives (int, double, boolean) hold values directly on the stack.",
                hints=["Think about how raw numbers differ from complex objects with multiple fields."],
                weight=0.15
            ),
            QuestStage(
                stage_number=2,
                stage_type="identify",
                title="🔍 Stage 2: Identify Loop Termination",
                prompt="Examine this for-loop. Exactly how many times will the iteration step execute?",
                code_snippet="for (int i = 0; i < 4; i++) {\n    launchProbe(i);\n}",
                options=["4 times (i = 0, 1, 2, 3)", "5 times (i = 0, 1, 2, 3, 4)", "3 times", "0 times"],
                correct_answer="4 times (i = 0, 1, 2, 3)",
                explanation="The condition i < 4 terminates when i becomes 4, so iterations run for i=0, 1, 2, 3 (4 total).",
                hints=["Count the values starting at 0: 0, 1, 2, 3."],
                weight=0.20
            ),
            QuestStage(
                stage_number=3,
                stage_type="apply",
                title="🧩 Stage 3: Apply Variable Type Conversion",
                prompt="Which declaration correctly initializes a floating point coordinate variable in Java without compilation error?",
                code_snippet="_____ orbitAltitude = 1240.75f;",
                options=["float", "int", "boolean", "char"],
                correct_answer="float",
                explanation="The suffix 'f' explicitly denotes a 32-bit single precision floating point literal.",
                hints=["Look at the trailing 'f' on 1240.75f."],
                weight=0.25
            ),
            QuestStage(
                stage_number=4,
                stage_type="challenge",
                title="⚔️ Stage 4: Independent Control Flow Challenge",
                prompt="What is the final value of 'telemetrySum' after the loop finishes?",
                code_snippet="int telemetrySum = 0;\nfor (int k = 1; k <= 3; k++) {\n    telemetrySum += k * 2;\n}",
                options=["12", "6", "18", "8"],
                correct_answer="12",
                explanation="k=1: +2 (sum=2); k=2: +4 (sum=6); k=3: +6 (sum=12).",
                hints=["Compute each step: (1*2) + (2*2) + (3*2) = 2 + 4 + 6 = 12."],
                weight=0.25
            ),
            QuestStage(
                stage_number=5,
                stage_type="demonstrate",
                title="🏆 Stage 5: Demonstrate Scope Mastery",
                prompt="If a variable is declared inside a loop block, can it be read outside after the loop finishes?",
                code_snippet="for (int x = 0; x < 5; x++) {\n    int delta = x * 10;\n}\nSystem.out.println(delta); // Line 4",
                options=["No, compilation error: delta is out of scope", "Yes, it prints 40", "Yes, it prints 0", "Yes, it prints 50"],
                correct_answer="No, compilation error: delta is out of scope",
                explanation="Block scope restricts visibility of 'delta' strictly within the loop brackets.",
                hints=["Variables declared inside braces {} cease to exist once execution leaves the block."],
                weight=0.15
            )
        ]
    ),
    "quest_methods": MasteryQuest(
        id="quest_methods",
        skill_id="methods",
        title="Master Methods & Functions",
        description="Master parameter passing, return contracts, and encapsulation of procedural logic.",
        difficulty="beginner",
        target_mastery=0.70,
        estimated_minutes=7,
        reward_xp=85,
        stages=[
            QuestStage(
                stage_number=1,
                stage_type="understand",
                title="🧠 Stage 1: Understand Pass-By-Value",
                prompt="Java is strictly pass-by-value. When an int primitive is passed into a method, what happens if the method modifies the parameter?",
                code_snippet="void boost(int energy) { energy += 50; }\n// Caller has int energy = 100;",
                options=["The caller's variable remains 100 because a copy was modified", "The caller's variable becomes 150", "The code throws a NullPointerException", "The variable becomes read-only"],
                correct_answer="The caller's variable remains 100 because a copy was modified",
                explanation="Pass-by-value passes a copy of the primitive value; modifications do not affect caller's variable.",
                hints=["A copy of the value is placed onto the new method's stack frame."],
                weight=0.15
            ),
            QuestStage(
                stage_number=2,
                stage_type="identify",
                title="🔍 Stage 2: Identify Method Overloading",
                prompt="Which pair of methods demonstrates valid method overloading in Java?",
                code_snippet="A: int scan(int freq) and int scan(double freq)\nB: int scan(int freq) and void scan(int freq)",
                options=["Pair A only", "Pair B only", "Both Pair A and Pair B", "Neither"],
                correct_answer="Pair A only",
                explanation="Method overloading requires differing parameter lists; changing only the return type (Pair B) causes a compilation error.",
                hints=["Overloading is distinguished by argument types or counts, never return type alone."],
                weight=0.20
            ),
            QuestStage(
                stage_number=3,
                stage_type="apply",
                title="🧩 Stage 3: Apply Recursive Base Case",
                prompt="What is the crucial base case required in this recursive countdown method to prevent a StackOverflowError?",
                code_snippet="void countdown(int n) {\n    if (_____)\n        return;\n    System.out.println(n);\n    countdown(n - 1);\n}",
                options=["n <= 0", "n == 100", "n != 0", "true"],
                correct_answer="n <= 0",
                explanation="The base case n <= 0 terminates recursion when reaching zero or below.",
                hints=["We want to stop recurring once the counter hits 0."],
                weight=0.25
            ),
            QuestStage(
                stage_number=4,
                stage_type="challenge",
                title="⚔️ Stage 4: Independent Return Prediction",
                prompt="What will computeFuel(3, 4) return?",
                code_snippet="int computeFuel(int base, int multiplier) {\n    if (base > 5) return base * multiplier;\n    return (base + 2) * multiplier;\n}",
                options=["20", "12", "15", "24"],
                correct_answer="20",
                explanation="base = 3 <= 5, so else branch executes: (3 + 2) * 4 = 5 * 4 = 20.",
                hints=["Check the if condition: is 3 > 5? If not, follow the second return."],
                weight=0.25
            ),
            QuestStage(
                stage_number=5,
                stage_type="demonstrate",
                title="🏆 Stage 5: Demonstrate Void vs Return Contracts",
                prompt="Can a method with 'void' return type contain a 'return;' statement without any value?",
                code_snippet="public void abortMission() {\n    if (!isCritical) return;\n    launchEscapePod();\n}",
                options=["Yes, 'return;' is valid for early exit in void methods", "No, void methods can never use the return keyword", "Only if the return type is Object", "Only inside a loop"],
                correct_answer="Yes, 'return;' is valid for early exit in void methods",
                explanation="A bare 'return;' immediately exits a void method without supplying a value.",
                hints=["Return without an expression simply halts execution of the method."],
                weight=0.15
            )
        ]
    ),
    "quest_oop_basics": MasteryQuest(
        id="quest_oop_basics",
        skill_id="oop_basics",
        title="Master Classes & Objects",
        description="Learn how state encapsulation, constructors, and reference identities form object-oriented programs.",
        difficulty="medium",
        target_mastery=0.70,
        estimated_minutes=8,
        reward_xp=90,
        stages=[
            QuestStage(
                stage_number=1,
                stage_type="understand",
                title="🧠 Stage 1: Understand Encapsulation & State",
                prompt="Why do we mark instance variables 'private' and provide public getter/setter methods?",
                code_snippet="public class Satellite {\n    private int batteryLevel;\n    public int getBattery() { return batteryLevel; }\n}",
                options=["To protect internal state from invalid mutations and decouple external callers", "To make the Java Virtual Machine run 10x faster", "Because private variables do not consume memory", "It is only required for graphics applications"],
                correct_answer="To protect internal state from invalid mutations and decouple external callers",
                explanation="Encapsulation prevents unauthorized or uncontrolled modification of internal object invariants.",
                hints=["Think about boundary validation: e.g. preventing negative battery percentages."],
                weight=0.15
            ),
            QuestStage(
                stage_number=2,
                stage_type="identify",
                title="🔍 Stage 2: Identify Constructor Invocations",
                prompt="When does a constructor execute in Java?",
                code_snippet="Spacecraft craft = new Spacecraft(\"Apollo\", 3);",
                options=["Immediately when 'new' allocates memory for the instance", "Every time any method of the class is called", "Only when the program shuts down", "Only when garbage collection runs"],
                correct_answer="Immediately when 'new' allocates memory for the instance",
                explanation="Constructors initialize instance state immediately upon object instantiation via 'new'.",
                hints=["The keyword 'new' requests heap allocation and calls the constructor."],
                weight=0.20
            ),
            QuestStage(
                stage_number=3,
                stage_type="apply",
                title="🧩 Stage 3: Apply The 'this' Reference",
                prompt="How do you assign the constructor argument 'shieldId' to the instance field with the same name?",
                code_snippet="public class Shield {\n    private String shieldId;\n    public Shield(String shieldId) {\n        ______ = shieldId;\n    }\n}",
                options=["this.shieldId", "Shield.shieldId", "super.shieldId", "shieldId.this"],
                correct_answer="this.shieldId",
                explanation="'this.shieldId' resolves shadowing by explicitly referring to the current object's instance variable.",
                hints=["'this' refers to the current instance being constructed."],
                weight=0.25
            ),
            QuestStage(
                stage_number=4,
                stage_type="challenge",
                title="⚔️ Stage 4: Independent Reference Comparison",
                prompt="What is printed by this comparison of two distinct objects with identical fields?",
                code_snippet="Probe p1 = new Probe(\"Voyager\");\nProbe p2 = new Probe(\"Voyager\");\nSystem.out.println(p1 == p2);",
                options=["false (== compares memory addresses, which differ)", "true (because their string names match)", "Compilation error", "null"],
                correct_answer="false (== compares memory addresses, which differ)",
                explanation="'==' checks reference identity (memory addresses). p1 and p2 are distinct heap objects.",
                hints=["p1 and p2 were created with separate 'new' invocations, so they have different heap addresses."],
                weight=0.25
            ),
            QuestStage(
                stage_number=5,
                stage_type="demonstrate",
                title="🏆 Stage 5: Demonstrate Static vs Instance State",
                prompt="If a variable is declared 'static int totalDrones', what is shared across all Drone instances?",
                code_snippet="public class Drone {\n    public static int totalDrones = 0;\n    public Drone() { totalDrones++; }\n}",
                options=["A single shared counter across all instances of Drone", "Each drone gets its own independent counter", "It resets to 0 whenever a drone lands", "It can only be used by main"],
                correct_answer="A single shared counter across all instances of Drone",
                explanation="Static fields belong to the class blueprint itself and are shared globally across all instances.",
                hints=["Static means class-level, not instance-level."],
                weight=0.15
            )
        ]
    ),
    "quest_inheritance": MasteryQuest(
        id="quest_inheritance",
        skill_id="inheritance",
        title="Master Inheritance & Subclassing",
        description="Master the 'extends' relationship, method overriding, super constructor calls, and polymorphic reuse.",
        difficulty="medium",
        target_mastery=0.70,
        estimated_minutes=8,
        reward_xp=100,
        stages=[
            QuestStage(
                stage_number=1,
                stage_type="understand",
                title="🧠 Stage 1: Understand IS-A Hierarchies",
                prompt="Inheritance models an 'IS-A' relationship. Which relationship correctly models inheritance?",
                code_snippet="public class CargoShip extends SpaceShip { ... }",
                options=["A CargoShip IS-A SpaceShip", "A SpaceShip HAS-A CargoShip", "A CargoShip USES-A SpaceShip", "A SpaceShip IS-A CargoShip"],
                correct_answer="A CargoShip IS-A SpaceShip",
                explanation="The subclass (CargoShip) specializes the superclass (SpaceShip), so CargoShip IS-A SpaceShip.",
                hints=["The class after 'extends' is the general parent."],
                weight=0.15
            ),
            QuestStage(
                stage_number=2,
                stage_type="identify",
                title="🔍 Stage 2: Identify Method Overriding Rules",
                prompt="Which annotation explicitly instructs the Java compiler to verify that a method correctly overrides a parent method?",
                code_snippet="_____ \npublic void launchThrusters() { ... }",
                options=["@Override", "@Inherit", "@Super", "@Implements"],
                correct_answer="@Override",
                explanation="@Override causes a compiler error if the method signature does not exactly match a superclass method.",
                hints=["It starts with an '@' and tells the compiler to check for overriding."],
                weight=0.20
            ),
            QuestStage(
                stage_number=3,
                stage_type="apply",
                title="🧩 Stage 3: Apply Super Constructor Calling",
                prompt="How must a subclass constructor call its parent's parameterized constructor?",
                code_snippet="public class Fighter extends Craft {\n    public Fighter(String code) {\n        ______;\n    }\n}",
                options=["super(code)", "Craft(code)", "this.super(code)", "parent(code)"],
                correct_answer="super(code)",
                explanation="super(...) calls the matching superclass constructor and must be the first line of the constructor body.",
                hints=["The keyword is 'super' and must be called like a function."],
                weight=0.25
            ),
            QuestStage(
                stage_number=4,
                stage_type="challenge",
                title="⚔️ Stage 4: Independent Polymorphic Dispatch Challenge",
                prompt="What output is printed when execute() is called on the 'Rover' reference typed as 'Vehicle'?",
                code_snippet="class Vehicle {\n    void ping() { System.out.print(\"V \"); }\n}\nclass Rover extends Vehicle {\n    void ping() { System.out.print(\"R \"); }\n}\nVehicle v = new Rover();\nv.ping();",
                options=["R ", "V ", "V R ", "Compilation error"],
                correct_answer="R ",
                explanation="Dynamic method dispatch resolves methods based on the actual runtime object (Rover), printing 'R '.",
                hints=["At runtime, what object was instantiated with 'new'? That class's method runs."],
                weight=0.25
            ),
            QuestStage(
                stage_number=5,
                stage_type="demonstrate",
                title="🏆 Stage 5: Demonstrate Final Keyword Impact",
                prompt="What happens if a developer attempts to extend a class marked with the 'final' keyword?",
                code_snippet="public final class CoreShield { ... }\npublic class ModdedShield extends CoreShield { ... }",
                options=["Compilation error: cannot inherit from final class", "It works normally", "Only static methods are inherited", "It compiles with a warning"],
                correct_answer="Compilation error: cannot inherit from final class",
                explanation="A 'final' class cannot be subclassed in Java.",
                hints=["Final on a class closes the inheritance hierarchy completely."],
                weight=0.15
            )
        ]
    ),
    "quest_polymorphism": MasteryQuest(
        id="quest_polymorphism",
        skill_id="polymorphism",
        title="Master Polymorphism & Dynamic Dispatch",
        description="Master runtime method dispatch, interface abstraction, upcasting, and loose coupling.",
        difficulty="advanced",
        target_mastery=0.70,
        estimated_minutes=9,
        reward_xp=120,
        stages=[
            QuestStage(
                stage_number=1,
                stage_type="understand",
                title="🧠 Stage 1: Understand Dynamic Method Dispatch",
                prompt="In Java polymorphism, which mechanism determines which overridden method version executes at runtime?",
                code_snippet="Sensor s = new ThermalSensor();\ns.calibrate();",
                options=["The actual runtime instance type created on the heap", "The static variable type declared by the compiler", "The file location of the class", "The order methods were written in code"],
                correct_answer="The actual runtime instance type created on the heap",
                explanation="Java uses the actual runtime object's virtual method table (vtable) to dispatch overridden calls.",
                hints=["Even though 's' is declared as Sensor, the object is a ThermalSensor."],
                weight=0.15
            ),
            QuestStage(
                stage_number=2,
                stage_type="identify",
                title="🔍 Stage 2: Identify Interface Implementation",
                prompt="Which keyword allows a Java class to promise fulfillment of an interface contract?",
                code_snippet="public class Beacon _____ Transmittable { ... }",
                options=["implements", "extends", "inherits", "using"],
                correct_answer="implements",
                explanation="Classes use 'implements' to satisfy interface contracts (and 'extends' for class inheritance).",
                hints=["Classes implement interfaces."],
                weight=0.20
            ),
            QuestStage(
                stage_number=3,
                stage_type="apply",
                title="🧩 Stage 3: Apply Polymorphic Collections",
                prompt="Why is it standard practice to declare polymorphic collections with interface types?",
                code_snippet="List<StarProbe> probes = new ArrayList<>();",
                options=["It decouples the code from the concrete ArrayList implementation", "ArrayList requires this exact line or it will crash", "It makes the collection read-only", "Interfaces run faster than classes"],
                correct_answer="It decouples the code from the concrete ArrayList implementation",
                explanation="Coding to the 'List' interface allows swapping implementations (e.g. to LinkedList) with zero code breaks.",
                hints=["Programming to interfaces increases modularity and flexibility."],
                weight=0.25
            ),
            QuestStage(
                stage_number=4,
                stage_type="challenge",
                title="⚔️ Stage 4: Independent Upcasting Challenge",
                prompt="Which line demonstrates safe polymorphic upcasting without an explicit cast operator?",
                code_snippet="Orbiter o = new Satellite(); // Line A (where Satellite extends Orbiter)\nSatellite s = new Orbiter(); // Line B",
                options=["Line A is valid; Line B causes compilation error", "Line B is valid; Line A causes compilation error", "Both are valid", "Neither is valid"],
                correct_answer="Line A is valid; Line B causes compilation error",
                explanation="Subclasses can be implicitly upcast to superclass references (Line A). Downcasting (Line B) requires explicit cast and runtime checks.",
                hints=["A Satellite is definitely an Orbiter, but not every Orbiter is a Satellite."],
                weight=0.25
            ),
            QuestStage(
                stage_number=5,
                stage_type="demonstrate",
                title="🏆 Stage 5: Demonstrate Abstract Classes vs Interfaces",
                prompt="Can an abstract class in Java have instance fields and concrete methods with method bodies?",
                code_snippet="abstract class Station {\n    private int energy = 100;\n    public void refuel() { energy = 100; }\n    abstract void broadcast();\n}",
                options=["Yes, abstract classes can have state and concrete methods alongside abstract ones", "No, abstract classes can only have abstract methods", "Only if all methods are static", "Only if marked final"],
                correct_answer="Yes, abstract classes can have state and concrete methods alongside abstract ones",
                explanation="Abstract classes provide shared implementation and state, unlike pure interfaces.",
                hints=["Abstract classes combine both concrete behavior and abstract contracts."],
                weight=0.15
            )
        ]
    ),
    "quest_collections": MasteryQuest(
        id="quest_collections",
        skill_id="collections",
        title="Master Collections & Data Structures",
        description="Master generic lists, sets, maps, iteration paradigms, and algorithmic efficiency.",
        difficulty="advanced",
        target_mastery=0.70,
        estimated_minutes=9,
        reward_xp=110,
        stages=[
            QuestStage(
                stage_number=1,
                stage_type="understand",
                title="🧠 Stage 1: Understand Generics Type Safety",
                prompt="What is the key compile-time advantage of using generic collections over raw types?",
                code_snippet="List<Waypoint> points = new ArrayList<>();",
                options=["Detects type mismatches at compile-time and eliminates explicit casting", "Makes the collection dynamically allocate unbounded RAM", "Prevents all null pointer exceptions automatically", "Makes lists immutable"],
                correct_answer="Detects type mismatches at compile-time and eliminates explicit casting",
                explanation="Generics enforce type safety at compile time, eliminating ClassCastExceptions at runtime.",
                hints=["Generics prevent inserting a String into a list of Waypoints at compile time."],
                weight=0.15
            ),
            QuestStage(
                stage_number=2,
                stage_type="identify",
                title="🔍 Stage 2: Identify List Performance Tradeoffs",
                prompt="Which collection provides O(1) constant-time index access (e.g. get(500))?",
                code_snippet="List<Telemetry> data = new _____<>();",
                options=["ArrayList", "LinkedList", "TreeSet", "Stack"],
                correct_answer="ArrayList",
                explanation="ArrayList is backed by an internal resizable array, enabling O(1) random access by index.",
                hints=["Arrays allow instant arithmetic calculation of element memory addresses."],
                weight=0.20
            ),
            QuestStage(
                stage_number=3,
                stage_type="apply",
                title="🧩 Stage 3: Apply Safe Iterator Removal",
                prompt="What exception is thrown if you modify a collection directly with list.remove() inside an enhanced for-loop?",
                code_snippet="for (Mission m : missions) {\n    if (m.isDone()) missions.remove(m);\n}",
                options=["ConcurrentModificationException", "IndexOutOfBoundsException", "NullPointerException", "StackOverflowError"],
                correct_answer="ConcurrentModificationException",
                explanation="Fail-fast iterators detect concurrent modification and throw ConcurrentModificationException. Use Iterator.remove() instead.",
                hints=["It warns that the collection was modified concurrently while iterating."],
                weight=0.25
            ),
            QuestStage(
                stage_number=4,
                stage_type="challenge",
                title="⚔️ Stage 4: Independent Set Uniqueness Challenge",
                prompt="If you add the strings 'Orbit', 'Landing', 'Orbit' to a HashSet<String>, what is the final size of the set?",
                code_snippet="Set<String> actions = new HashSet<>();\nactions.add(\"Orbit\");\nactions.add(\"Landing\");\nactions.add(\"Orbit\");",
                options=["2", "3", "1", "0"],
                correct_answer="2",
                explanation="Sets strictly guarantee element uniqueness based on equals()/hashCode(); duplicate 'Orbit' is rejected.",
                hints=["Sets do not permit duplicate items."],
                weight=0.25
            ),
            QuestStage(
                stage_number=5,
                stage_type="demonstrate",
                title="🏆 Stage 5: Demonstrate Map Key-Value Lookups",
                prompt="Which method retrieves a value from a Map<String, Integer> or returns a default fallback if the key is absent?",
                code_snippet="Map<String, Integer> inventory = new HashMap<>();\nint oxygen = inventory.____(\"O2\", 0);",
                options=["getOrDefault", "getOrElse", "findOrDefault", "fetchWithDefault"],
                correct_answer="getOrDefault",
                explanation="Map.getOrDefault(key, defaultValue) safely handles absent keys without manual null checking.",
                hints=["It gets the value or returns the default."],
                weight=0.15
            )
        ]
    )
}

# --------------------------------------------------------------------------
# 👑 BOSS CHALLENGE: THE GALACTIC FLEET DISPATCHER
# --------------------------------------------------------------------------
OOP_BOSS_CHALLENGE = BossChallenge(
    id="boss_oop_fleet",
    title="👑 Galactic Fleet Dispatcher: OOP Synthesis",
    description="Synthesize Classes, Inheritance, Polymorphism, and Methods to architect an autonomous planetary fleet dispatch engine.",
    difficulty="hard",
    skills_tested=["oop_basics", "inheritance", "polymorphism", "methods"],
    reward_xp=150,
    estimated_minutes=12,
    scenarios=[
        BossChallengeScenario(
            id="sc_1",
            title="Milestone 1: Architectural Hierarchy Design",
            prompt="You need to dispatch three ship types: ScoutShip, MiningVessel, and FlagShip. Each must execute its specialized patrol protocol when dispatchFleet() loops through a List<Spacecraft>. How should you structure this in Java?",
            code_context="public abstract class Spacecraft {\n    public abstract void patrol();\n}\n// ScoutShip, MiningVessel, FlagShip extend Spacecraft",
            options=[
                "Declare abstract class Spacecraft with abstract patrol() method, and have each subclass override patrol()",
                "Create three totally independent classes and write separate loops for each",
                "Put all code into a single gigantic method with 20 if-else statements",
                "Use static variables for all ship coordinates"
            ],
            correct_answer="Declare abstract class Spacecraft with abstract patrol() method, and have each subclass override patrol()",
            explanation="An abstract superclass with polymorphic patrol() allows dispatchFleet() to call patrol() uniformly without knowing concrete subclasses.",
            skills_addressed=["oop_basics", "inheritance", "polymorphism"]
        ),
        BossChallengeScenario(
            id="sc_2",
            title="Milestone 2: Dynamic Dispatch Under High Load",
            prompt="During an asteroid emergency, the fleet commander passes List<Spacecraft> to an evasive maneuvers method. Why is this code guaranteed to execute each ship's custom evasion behavior without casting?",
            code_context="for (Spacecraft ship : fleet) {\n    ship.evadeHazard(); // Each subclass provides its own evasion algorithm\n}",
            options=[
                "Polymorphism dynamically resolves evadeHazard() to the concrete subclass object at runtime",
                "Java randomly picks one method and applies it to all ships",
                "The compiler converts all subclasses into interfaces",
                "It only works if all ships have identical fuel levels"
            ],
            correct_answer="Polymorphism dynamically resolves evadeHazard() to the concrete subclass object at runtime",
            explanation="Dynamic method dispatch looks up the runtime vtable for each ship instance, invoking its specific overridden implementation.",
            skills_addressed=["inheritance", "polymorphism"]
        ),
        BossChallengeScenario(
            id="sc_3",
            title="Milestone 3: Encapsulation & Fail-Safe State Mutations",
            prompt="A rogue subroutine attempts to set a Spacecraft's shields to -500. How do we ensure shield levels cannot be corrupted?",
            code_context="public void setShields(int value) {\n    if (value < 0) this.shields = 0;\n    else if (value > 100) this.shields = 100;\n    else this.shields = value;\n}",
            options=[
                "Mark shields private and enforce invariant boundary checks inside the public setter method",
                "Make shields public so any caller can fix errors",
                "Delete the shield variable completely",
                "Store shields in an unchangeable final constant"
            ],
            correct_answer="Mark shields private and enforce invariant boundary checks inside the public setter method",
            explanation="Encapsulation protects object integrity by validating all mutations against valid class invariants.",
            skills_addressed=["oop_basics", "methods"]
        )
    ]
)

# --------------------------------------------------------------------------
# SERVICE IMPLEMENTATION
# --------------------------------------------------------------------------
class MasteryGameService:
    """
    Engine driving Skill-Based Gamification where Game Progress Represents REAL LEARNING.
    """

    def compute_evolution_stage(self, mastery_score: Optional[float]) -> str:
        """Translates mastery score into visual skill evolution stage."""
        if mastery_score is None:
            return SkillEvolutionStage.UNEXPLORED.value
        m = float(mastery_score)
        if m < 0.30:
            return SkillEvolutionStage.UNEXPLORED.value
        elif m < 0.50:
            return SkillEvolutionStage.SEED.value
        elif m < 0.70:
            return SkillEvolutionStage.SPROUT.value
        elif m < 0.85:
            return SkillEvolutionStage.STRONG.value
        else:
            return SkillEvolutionStage.MASTERED.value

    def compute_mastery_status(self, mastery_score: Optional[float]) -> str:
        """Computes standardized status string."""
        if mastery_score is None:
            return "NOT_ASSESSED"
        m = float(mastery_score)
        if m < 0.40:
            return "NEEDS_PRACTICE"
        elif m < 0.70:
            return "DEVELOPING"
        elif m < 0.85:
            return "PROFICIENT"
        else:
            return "MASTERED"

    def compute_learner_level(self, mastered_count: int, avg_mastery: float) -> Tuple[int, str]:
        """
        Calculates learner level based primarily on verified skill development,
        combining skills mastered and average mastery.
        """
        if mastered_count >= 5 and avg_mastery >= 0.85:
            return 6, "Master"
        elif mastered_count >= 4 and avg_mastery >= 0.78:
            return 5, "Advanced Thinker"
        elif mastered_count >= 3 and avg_mastery >= 0.68:
            return 4, "Skill Crafter"
        elif mastered_count >= 2 and avg_mastery >= 0.55:
            return 3, "Problem Solver"
        elif mastered_count >= 1 or avg_mastery >= 0.40:
            return 2, "Foundation Builder"
        else:
            return 1, "Skill Explorer"

    async def get_or_initialize_universe(self, learner_id: str) -> SkillUniverseResponse:
        """
        Retrieves or constructs the Learner's Skill Universe.
        Seamlessly reads prior calibration diagnostic profiles.
        """
        db = get_database()
        
        # 1. Fetch persistent learner mastery state if exists
        state_doc = await db["skill_mastery_states"].find_one({"learner_id": learner_id})
        
        # 2. Check for SkillForge Calibration profile to seed initial baseline
        calib_profile = await db["calibration_profiles"].find_one(
            {"learner_id": learner_id},
            sort=[("calibrated_at", -1)]
        )
        if not calib_profile:
            calib_profile = await db["learner_skill_profiles"].find_one(
                {"learner_id": learner_id},
                sort=[("calibrated_at", -1)]
            )

        skill_mastery_map: Dict[str, Dict[str, Any]] = {}
        if state_doc and "skills" in state_doc:
            skill_mastery_map = state_doc["skills"]
        elif calib_profile and "skills" in calib_profile:
            raw_skills = calib_profile.get("skills", [])
            skill_items = list(raw_skills.values()) if isinstance(raw_skills, dict) else raw_skills
            # Map calibration skills into mastery universe
            for item in skill_items:
                s_name = (item.get("skill") or item.get("skill_name") or "").lower().replace(" ", "_")
                if s_name == "oop_basics" or "oop" in s_name:
                    k = "oop_basics"
                elif "fund" in s_name:
                    k = "fundamentals"
                elif "meth" in s_name:
                    k = "methods"
                elif "inher" in s_name:
                    k = "inheritance"
                elif "poly" in s_name:
                    k = "polymorphism"
                elif "coll" in s_name:
                    k = "collections"
                else:
                    k = s_name

                raw_score = item.get("mastery_score")
                raw_status = item.get("status", "NOT_ASSESSED")
                if raw_status == "ASSESSED" or (raw_score is not None and raw_status not in ["NEEDS_PRACTICE", "DEVELOPING", "PROFICIENT", "MASTERED"]):
                    status = self.compute_mastery_status(raw_score)
                else:
                    status = raw_status if raw_score is not None else "NOT_ASSESSED"
                ev_count = item.get("evidence_count", 0)

                skill_mastery_map[k] = {
                    "current_mastery": raw_score,
                    "previous_mastery": raw_score,
                    "status": status,
                    "evidence_count": ev_count,
                    "strengths": item.get("strengths", []),
                    "gaps": item.get("gaps", []),
                    "confidence": "HIGH" if ev_count >= 4 else "MEDIUM" if ev_count >= 2 else "LOW",
                    "last_assessed_at": item.get("last_assessed") or calib_profile.get("calibrated_at") or datetime.utcnow()
                }

        # 3. Build SkillProgressNodes with strict prerequisite gates
        nodes: List[SkillProgressNode] = []
        active_node_id = "fundamentals"
        found_active = False

        for skill_id, defn in SKILL_GRAPH_DEFINITIONS.items():
            existing = skill_mastery_map.get(skill_id, {})
            current_m = existing.get("current_mastery")
            prev_m = existing.get("previous_mastery")
            ev_count = existing.get("evidence_count", 0)
            conf = existing.get("confidence", "LOW")
            last_assessed = existing.get("last_assessed_at")

            status = existing.get("status")
            if not status:
                status = self.compute_mastery_status(current_m)
            
            evolution = self.compute_evolution_stage(current_m)

            # Evaluate Prerequisite Gate
            prereqs = defn["prerequisites"]
            is_unlocked = True
            lock_reason = None

            for p_id in prereqs:
                p_state = skill_mastery_map.get(p_id, {})
                p_score = p_state.get("current_mastery")
                p_title = SKILL_GRAPH_DEFINITIONS.get(p_id, {}).get("title", p_id)
                threshold = defn["threshold"]

                if p_score is None or p_score < threshold:
                    is_unlocked = False
                    pct = int(threshold * 100)
                    lock_reason = f"Requires: {p_title} ≥ {pct}%"
                    break

            # If learner demonstrated high mastery in calibration (>= 85%), they skip beginner quests
            is_skipped = (current_m is not None and current_m >= 0.85)

            # Breakdown
            m_val = current_m or 0.0
            breakdown = SkillBreakdown(
                concept_understanding=round(min(1.0, m_val * 1.1), 2),
                recall=round(min(1.0, m_val * 0.95), 2),
                application=round(min(1.0, m_val * 0.9), 2),
                independent_problem_solving=round(min(1.0, m_val * 0.85), 2)
            )

            node = SkillProgressNode(
                skill_id=skill_id,
                title=defn["title"],
                description=defn["description"],
                prerequisites=prereqs,
                prerequisite_threshold=defn["threshold"],
                previous_mastery=prev_m,
                current_mastery=current_m,
                mastery_status=status,
                evolution_stage=evolution,
                is_unlocked=is_unlocked,
                is_skipped_as_known=is_skipped,
                lock_reason=lock_reason,
                confidence=conf,
                evidence_count=ev_count,
                breakdown=breakdown,
                last_assessed_at=last_assessed
            )
            nodes.append(node)

            # Identify "📍 YOU ARE HERE" pointer (first unlocked node that is developing or needs practice)
            if not found_active and is_unlocked and (current_m is None or current_m < 0.85):
                active_node_id = skill_id
                found_active = True

        # 4. Determine "🎯 YOUR NEXT QUEST"
        next_quest_obj = None
        target_quest_key = f"quest_{active_node_id}"
        q_template = MASTER_QUESTS.get(target_quest_key)
        
        if q_template:
            active_node = next((n for n in nodes if n.skill_id == active_node_id), None)
            curr_score = active_node.current_mastery if active_node else 0.0
            curr_score_display = int((curr_score or 0.0) * 100)
            
            why_reasons = []
            if active_node and active_node.prerequisites:
                p_titles = [SKILL_GRAPH_DEFINITIONS[p]["title"] for p in active_node.prerequisites]
                why_reasons.append(f"✓ You have satisfied prerequisite foundations ({', '.join(p_titles)})")
            why_reasons.append(f"✓ Current mastery is {curr_score_display}% — targeted practice will elevate your level")
            
            # Find downstream skills that this will unlock
            downstream = [defn["title"] for sid, defn in SKILL_GRAPH_DEFINITIONS.items() if active_node_id in defn["prerequisites"]]
            if downstream:
                why_reasons.append(f"🔓 Reaching 70% unlocks {', '.join(downstream)}")

            next_quest_obj = {
                "id": q_template.id,
                "skill_id": q_template.skill_id,
                "title": q_template.title,
                "description": q_template.description,
                "difficulty": q_template.difficulty,
                "current_mastery": curr_score,
                "target_mastery": q_template.target_mastery,
                "estimated_minutes": q_template.estimated_minutes,
                "reward_xp": q_template.reward_xp,
                "why_this_quest": why_reasons
            }

        # 5. Fetch Profile (Level, Learning XP, Activity, Streak)
        profile_doc = await db["learner_mastery_profiles"].find_one({"learner_id": learner_id})
        
        # Calculate level from nodes
        assessed_scores = [n.current_mastery for n in nodes if n.current_mastery is not None]
        mastered_cnt = sum(1 for n in nodes if n.current_mastery is not None and n.current_mastery >= 0.85)
        avg_m = (sum(assessed_scores) / len(assessed_scores)) if assessed_scores else 0.0
        computed_level, computed_title = self.compute_learner_level(mastered_cnt, avg_m)

        learning_xp = profile_doc.get("learning_xp", 150) if profile_doc else 150
        activity_mins = profile_doc.get("activity_minutes", 45) if profile_doc else 45
        streak_days = profile_doc.get("mastery_streak_days", 1) if profile_doc else 1
        achievements_raw = profile_doc.get("achievements", []) if profile_doc else []

        # Default achievements if empty
        if not achievements_raw:
            achievements_raw = [
                {"id": "ach_first_mastery", "name": "First Skill Mastered", "description": "Demonstrate >=85% mastery in any skill", "icon": "Award", "is_unlocked": mastered_cnt >= 1},
                {"id": "ach_deep_thinker", "name": "Deep Thinker", "description": "Solve 5 application-level challenges", "icon": "Brain", "is_unlocked": False},
                {"id": "ach_skill_builder", "name": "Skill Builder", "description": "Elevate a single skill by +30% in one quest", "icon": "TrendingUp", "is_unlocked": False},
                {"id": "ach_boss_slayer", "name": "Boss Slayer", "description": "Conquer the OOP Galactic Fleet Boss Challenge", "icon": "Crown", "is_unlocked": False}
            ]

        # Convert achievements to models
        achievements = [MasteryAchievement(**a) for a in achievements_raw]

        return SkillUniverseResponse(
            learner_id=learner_id,
            level=computed_level,
            level_title=computed_title,
            learning_xp=learning_xp,
            activity_minutes=activity_mins,
            mastery_streak=streak_days,
            nodes=nodes,
            active_node_id=active_node_id,
            next_quest=next_quest_obj,
            boss_challenge=OOP_BOSS_CHALLENGE,
            achievements=achievements
        )

    async def evaluate_quest_attempt(
        self,
        learner_id: str,
        quest_id: str,
        stage_submissions: List[Dict[str, Any]]
    ) -> QuestEvaluationResult:
        """
        Evaluates a 5-stage quest attempt against demonstrated learning evidence.
        Updates mastery, evolutions, gates, and Learning XP.
        """
        db = get_database()
        quest = MASTER_QUESTS.get(quest_id)
        if not quest:
            # Fallback default quest for generic ID
            quest = MASTER_QUESTS["quest_fundamentals"]

        skill_id = quest.skill_id

        # 1. Fetch current skill state
        universe = await self.get_or_initialize_universe(learner_id)
        current_node = next((n for n in universe.nodes if n.skill_id == skill_id), None)
        
        mastery_before = current_node.current_mastery if current_node else None
        status_before = current_node.mastery_status if current_node else "NOT_ASSESSED"
        evolution_before = current_node.evolution_stage if current_node else "unexplored"

        # Baseline start for calculation
        base_score = mastery_before if mastery_before is not None else 0.40

        # 2. Evaluate stage submissions
        correct_weight = 0.0
        total_weight = 0.0
        correct_count = 0

        sub_map = {s["stage_number"]: s for s in stage_submissions}

        for stage in quest.stages:
            total_weight += stage.weight
            sub = sub_map.get(stage.stage_number)
            if sub:
                user_ans = str(sub.get("selected_answer", "")).strip().lower()
                expected = str(stage.correct_answer).strip().lower()
                if user_ans == expected:
                    correct_count += 1
                    # Slight penalty if hint was used
                    hint_mult = 0.85 if sub.get("hint_used") else 1.0
                    correct_weight += stage.weight * hint_mult

        score_fraction = (correct_weight / total_weight) if total_weight > 0 else 0.0

        # 3. Calculate Mastery Delta based strictly on demonstrated performance
        # Performance >= 70%: mastery increases (e.g. +20% to +35%)
        # Performance < 50%: mastery drops slightly or holds; NO FALSE INCREASE
        gain = 0.0
        remedial_feedback = None

        if score_fraction >= 0.80:
            # Strong performance
            gain = 0.28 + (score_fraction - 0.80) * 0.40
            mastery_after = min(1.0, round(base_score + gain, 2))
        elif score_fraction >= 0.60:
            # Developing performance
            gain = 0.15
            mastery_after = min(1.0, round(base_score + gain, 2))
        else:
            # Struggling performance: do not falsely increase mastery!
            # Slight conservative adjustment, no harsh punishment
            mastery_after = max(0.20, round(base_score - 0.02, 2))
            gain = round(mastery_after - base_score, 2)
            remedial_feedback = (
                "Your performance shows this skill is still developing. "
                "Keep practicing with scaffolded hints — no XP was lost!"
            )

        status_after = self.compute_mastery_status(mastery_after)
        evolution_after = self.compute_evolution_stage(mastery_after)
        evolution_changed = (evolution_before != evolution_after)
        is_completed = (score_fraction >= 0.60)

        # 4. Determine Unlocked Skills (if prerequisite threshold achieved)
        unlocked_skills = []
        if mastery_after >= 0.70:
            for sid, defn in SKILL_GRAPH_DEFINITIONS.items():
                if skill_id in defn["prerequisites"]:
                    unlocked_skills.append(defn["title"])

        # 5. Award Learning XP (strictly from verified evidence)
        learning_xp_earned = 0
        if is_completed:
            learning_xp_earned = quest.reward_xp
            if mastery_after >= 0.85:
                learning_xp_earned += 100  # Skill Mastery Bonus

        # 6. Persist Updated Skill Mastery State
        current_evidence = (current_node.evidence_count if current_node else 0) + len(stage_submissions)
        update_payload = {
            f"skills.{skill_id}": {
                "current_mastery": mastery_after,
                "previous_mastery": base_score,
                "status": status_after,
                "evolution_stage": evolution_after,
                "evidence_count": current_evidence,
                "confidence": "HIGH" if current_evidence >= 5 else "MEDIUM",
                "last_assessed_at": datetime.utcnow()
            }
        }
        await db["skill_mastery_states"].update_one(
            {"learner_id": learner_id},
            {"$set": update_payload},
            upsert=True
        )

        # 7. Update Learner Profile (Learning XP & Streak)
        today_str = date.today().isoformat()
        profile_doc = await db["learner_mastery_profiles"].find_one({"learner_id": learner_id})
        
        last_date = profile_doc.get("last_learning_date") if profile_doc else None
        current_streak = profile_doc.get("mastery_streak_days", 1) if profile_doc else 1
        
        # Mastery streak continues ONLY on verified learning
        if last_date != today_str and is_completed:
            current_streak += 1

        await db["learner_mastery_profiles"].update_one(
            {"learner_id": learner_id},
            {
                "$inc": {
                    "learning_xp": learning_xp_earned,
                    "activity_minutes": quest.estimated_minutes
                },
                "$set": {
                    "last_learning_date": today_str,
                    "mastery_streak_days": current_streak,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )

        # Check Achievements
        achievements_to_unlock = []
        if mastery_after >= 0.85:
            achievements_to_unlock.append("ach_first_mastery")
        if gain >= 0.30:
            achievements_to_unlock.append("ach_skill_builder")

        if achievements_to_unlock:
            await db["learner_mastery_profiles"].update_one(
                {"learner_id": learner_id, "achievements.id": {"$in": achievements_to_unlock}},
                {"$set": {"achievements.$.is_unlocked": True, "achievements.$.unlocked_at": datetime.utcnow()}}
            )

        # 8. Compute Next Recommended Quest
        next_universe = await self.get_or_initialize_universe(learner_id)
        next_quest = next_universe.next_quest

        return QuestEvaluationResult(
            quest_id=quest_id,
            skill_id=skill_id,
            mastery_before=mastery_before,
            mastery_after=mastery_after,
            gain_percentage=round(gain * 100, 1),
            status_before=status_before,
            status_after=status_after,
            evolution_before=evolution_before,
            evolution_after=evolution_after,
            evolution_changed=evolution_changed,
            is_completed=is_completed,
            unlocked_skills=unlocked_skills,
            learning_xp_earned=learning_xp_earned,
            remedial_feedback=remedial_feedback,
            next_recommended_quest=next_quest
        )

    async def evaluate_boss_challenge(
        self,
        learner_id: str,
        boss_id: str,
        scenario_submissions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Evaluates OOP Boss Challenge attempt."""
        db = get_database()
        boss = OOP_BOSS_CHALLENGE
        correct_count = 0
        sub_map = {s["id"]: s["selected_answer"] for s in scenario_submissions}

        for sc in boss.scenarios:
            selected = sub_map.get(sc.id, "").strip().lower()
            if selected == sc.correct_answer.strip().lower():
                correct_count += 1

        passed = (correct_count == len(boss.scenarios))
        xp_earned = boss.reward_xp if passed else 30

        if passed:
            # Mark boss achievement
            await db["learner_mastery_profiles"].update_one(
                {"learner_id": learner_id},
                {
                    "$inc": {"learning_xp": xp_earned, "activity_minutes": boss.estimated_minutes},
                    "$set": {"boss_slain": True, "boss_completed_at": datetime.utcnow()}
                },
                upsert=True
            )

        return {
            "boss_id": boss_id,
            "passed": passed,
            "correct_scenarios": correct_count,
            "total_scenarios": len(boss.scenarios),
            "xp_earned": xp_earned,
            "message": "👑 Victory! Galactic Fleet Dispatcher Boss Conquered!" if passed else "The fleet system encountered unexpected behavior. Review OOP dynamic dispatch and retry!"
        }

mastery_game_service = MasteryGameService()
