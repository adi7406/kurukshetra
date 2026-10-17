/**
 * Subject Curricula Database: Operating Systems (OS) and Object-Oriented Programming (OOP)
 * Implements authoritative technical curricula adhering to:
 * 1. Required Sections:
 *    - learning_objectives
 *    - prerequisite_review
 *    - core_explanation (deep technical invariants)
 *    - worked_examples (concrete runnable code)
 *    - common_misconceptions
 *    - key_takeaways
 * 2. Visual / ASCII Diagrams
 * 3. At least 5 Quizzes per topic (15 Quizzes per subject) with Bloom rationales
 * 4. Proper Coding Assessment per topic with constraints, starter code, sample tests & AI viva questions
 */

export const OS_TOPICS_DATABASE = {
  os_fundamentals: {
    id: 'c_os_fundamentals',
    name: 'Operating System Fundamentals & Kernel Architecture',
    module: 'Module 1: Kernel Architecture & Dual-Mode Execution',
    prerequisite: 'Computer Organization & Digital Logic Fundamentals',
    prerequisiteReview: 'Von Neumann computing architecture, instruction execution cycles, memory address bus, and general-purpose CPU registers (IP/PC, SP, Flags).',
    diagramType: 'tree',
    complexities: {
      userToKernel: 'O(1) Trap / Syscall latency (~50-100ns)',
      contextSwitch: 'O(1) register save + TLB flush overhead',
      interruptDispatch: 'O(1) Interrupt Descriptor Table (IDT) vector lookup',
      protection: 'Hardware-enforced Ring 0 vs Ring 3 CPU privilege levels',
    },
    text: `An Operating System (OS) is the foundational system software that manages hardware resources and provides a secure, abstracted interface between user applications and physical hardware.

1. Dual-Mode Operation (Kernel Mode vs. User Mode):
Modern microprocessors guarantee system security through hardware-enforced privilege rings (e.g., x86 Ring 0 for Kernel Mode, Ring 3 for User Mode):
- User Mode (Ring 3): Applications execute with restricted CPU instruction privileges. Direct access to physical memory addresses, I/O ports, or control registers (CR0, CR3) triggers a CPU General Protection Fault (GPF).
- Kernel Mode (Ring 0): The OS kernel executes with unrestricted access to all machine instructions, MMU page tables, physical RAM, and device drivers.

2. System Calls & The Trap Gate Architecture:
Whenever an application requires privileged hardware resources (e.g., reading a file, allocating memory, creating a process), it executes a software interrupt or specialized CPU instruction (such as 'syscall' or 'sysenter'):
- The CPU hardware atomically transitions from User Mode to Kernel Mode.
- General-purpose register states (program counter, stack pointer, registers) are pushed onto the process's Kernel Stack.
- The CPU jumps to the fixed handler address specified in the Interrupt Descriptor Table (IDT).
- The kernel validates system call arguments, executes the requested driver service, places the return value in register RAX/EAX, and executes 'sysret' to restore User Mode.

3. Process Control Block (PCB) & Process State Lifecycle:
The kernel represents every active program as a Process Control Block (PCB) tracking:
- Process Identifier (PID) and Parent PID (PPID)
- Execution State: NEW, READY, RUNNING, WAITING/BLOCKED, TERMINATED
- CPU Register Snapshot for context switches
- Memory management structures (Page Table base pointer)
- Open File Descriptor Table (stdin=0, stdout=1, stderr=2)`,

    asciiDiagram: `
+---------------------------------------------------------------+
|             DUAL-MODE CPU ARCHITECTURAL TRANSITION            |
+---------------------------------------------------------------+
  [ USER SPACE - Ring 3 ]
    User Application (e.g. read(), fork(), malloc())
          |
          | 1. Store Syscall Number in RAX, Parameters in RDI, RSI
          v
    [ CPU TRAP INSTRUCTION ]  ---> Hardware Mode Switch (Ring 3 -> Ring 0)
          |
  [ KERNEL SPACE - Ring 0 ]
          | 2. Save User Registers onto Kernel Stack
          v
    Interrupt Descriptor Table (IDT) -> Syscall Dispatch Table
          | 3. Execute Driver / Memory / File Operation
          v
    Place Return Value in RAX -> Execute 'SYSRET' (Ring 0 -> Ring 3)
`,

    example: `# Process State Machine & Dual-Mode Trap Simulation
class SimulatedPCB:
    def __init__(self, pid, name):
        self.pid = pid
        self.name = name
        self.state = "NEW"
        self.saved_pc = 0
        self.registers = {"RAX": 0, "RBX": 0, "RSP": 0x7FFF0000}
        self.file_descriptors = {0: "stdin", 1: "stdout", 2: "stderr"}

    def transition_to(self, new_state):
        valid_transitions = {
            "NEW": ["READY"],
            "READY": ["RUNNING"],
            "RUNNING": ["WAITING", "READY", "TERMINATED"],
            "WAITING": ["READY"],
            "TERMINATED": []
        }
        if new_state in valid_transitions[self.state]:
            self.state = new_state
        else:
            raise ValueError(f"Invalid transition from {self.state} to {new_state}")

def simulate_system_call(pcb, syscall_number, arg):
    # Ring 3 -> Ring 0 switch
    print(f"[TRAP] CPU Transition to Kernel Mode for PID {pcb.pid}")
    if syscall_number == 1:  # sys_write
        print(f"[KERNEL] sys_write invoked: '{arg}'")
        pcb.registers["RAX"] = len(arg)
    elif syscall_number == 60: # sys_exit
        pcb.transition_to("TERMINATED")
        print(f"[KERNEL] sys_exit: PID {pcb.pid} terminated.")
    return pcb.registers["RAX"]

# Trace
pcb = SimulatedPCB(101, "web_worker")
pcb.transition_to("READY")
pcb.transition_to("RUNNING")
bytes_written = simulate_system_call(pcb, 1, "Hello Operating Systems")
print("Syscall return value (bytes written):", bytes_written)`,

    objectives: [
      'Distinguish User Mode (Ring 3) and Kernel Mode (Ring 0) hardware privilege enforcement',
      'Explain the atomic hardware execution sequence during a system call trap transition',
      'Trace the lifecycle states of a process from NEW to READY, RUNNING, WAITING, and TERMINATED',
      'Analyze the critical fields stored within a Process Control Block (PCB)',
    ],

    misconceptions: [
      'Believing system calls are ordinary user library functions rather than CPU hardware trap transitions',
      'Assuming the CPU can execute I/O instructions directly from user applications without kernel mediation',
      'Thinking context switching between processes does not incur memory cache and TLB invalidation penalties',
    ],

    keyTakeaways: [
      'Dual-mode execution isolates crashed or malicious user applications from affecting system stability',
      'The Interrupt Descriptor Table (IDT) ensures deterministic, secure entry points into the OS kernel',
      'The Process Control Block preserves complete CPU context across preemptive scheduling intervals',
    ],

    quizzes: [
      {
        id: 'q_os_01',
        title: 'CPU Privilege Rings and Dual-Mode Execution',
        prompt: 'What occurs at the hardware level if a user-space application attempts to execute a privileged CPU instruction (such as loading the CR3 page directory register)?',
        options: [
          'The CPU generates a General Protection Fault (trap), immediately halting execution and transferring control to the kernel',
          'The CPU silently ignores the instruction and increments the Program Counter to the next instruction',
          'The instruction executes successfully but writes a warning message to standard error',
          'The user process is automatically granted temporary root access for that instruction',
        ],
        correct: 0,
        explanation: 'Privileged instructions can strictly execute in CPU Ring 0 (Kernel Mode). If attempted in Ring 3, the CPU hardware generates an architectural protection fault, transferring control to the OS kernel exception handler.',
      },
      {
        id: 'q_os_02',
        title: 'System Call Atomic Context Preservation',
        prompt: 'Why must the CPU and OS kernel save user registers onto a dedicated Kernel Stack rather than the application user stack during a system call?',
        options: [
          'The user stack pointer may be invalid, corrupted, or maliciously manipulated, which would crash or compromise the kernel',
          'The user stack does not have enough storage bytes to hold 64-bit registers',
          'User stacks are read-only memory segments by default in modern operating systems',
          'The kernel stack is stored on physical NVMe storage rather than RAM',
        ],
        correct: 0,
        explanation: 'A user application could supply an invalid or corrupted stack pointer (RSP). If the kernel attempted to push privileged register data onto an untrusted user stack, a page fault or security breach would occur.',
      },
      {
        id: 'q_os_03',
        title: 'Process State Transitions',
        prompt: 'When a RUNNING process issues an I/O request (such as reading from disk), which process state transition occurs?',
        options: [
          'RUNNING to WAITING (BLOCKED), freeing the CPU for other READY processes',
          'RUNNING to READY, continuing to poll the disk controller in a busy loop',
          'RUNNING to TERMINATED, requiring the program to restart from main()',
          'RUNNING directly to NEW to allocate additional memory buffers',
        ],
        correct: 0,
        explanation: 'Because disk I/O takes milliseconds, the OS places the process into the WAITING/BLOCKED state so the CPU scheduler can dispatch another READY process, eliminating wasteful idle cycles.',
      },
      {
        id: 'q_os_04',
        title: 'Role of the Process Control Block (PCB)',
        prompt: 'Which of the following is NOT stored inside a Process Control Block (PCB)?',
        options: [
          'The compiled source code machine instructions of third-party libraries installed on other computers',
          'The Program Counter (PC) pointing to the next instruction to execute',
          'The Process Identifier (PID) and parent process link',
          'The base pointer to the virtual memory page table for address translation',
        ],
        correct: 0,
        explanation: 'The PCB stores process-specific runtime metadata: PID, state, saved registers, memory limits/page tables, and open file descriptors. It does not store external unrelated binaries.',
      },
      {
        id: 'q_os_05',
        title: 'Context Switching Overhead Mechanics',
        prompt: 'What constitutes the major performance cost during an OS process context switch?',
        options: [
          'Saving/restoring CPU registers, switching page tables (CR3), and resulting Translation Lookaside Buffer (TLB) cache invalidation',
          'Recompiling the Python or C source code from disk',
          'Re-formatting the physical hard drive partitions',
          'Encrypting the entire RAM buffer using AES-256',
        ],
        correct: 0,
        explanation: 'Beyond register copying, switching the memory address space (flushing the TLB cache) causes subsequent memory accesses in the newly scheduled process to suffer expensive multi-level page table walks.',
      },
    ],

    codingAssessment: {
      id: 'ca_os_01',
      title: 'Process State Machine & Transition Validator',
      difficulty: 'Easy',
      concept: 'Operating System Fundamentals & Kernel Architecture',
      description: `Implement an Operating System Process State Transition Validator.

Given a list of state transitions represented as tuples '(from_state, to_state)', validate whether the entire sequence follows legal OS process lifecycle rules:
- Allowed states: 'NEW', 'READY', 'RUNNING', 'WAITING', 'TERMINATED'
- Valid transitions:
  - 'NEW' -> 'READY'
  - 'READY' -> 'RUNNING'
  - 'RUNNING' -> 'WAITING', 'READY', or 'TERMINATED'
  - 'WAITING' -> 'READY'
  - Once in 'TERMINATED', no further transitions are allowed.

Return True if all transitions in the sequence are valid, or False if an illegal transition occurs.`,
      constraints: 'O(N) Time Complexity | O(1) Auxiliary Memory | Strict Lifecycle Enforcement',
      starterCode: `def validate_process_lifecycle(transitions: list[tuple[str, str]]) -> bool:
    """
    Validates a sequence of (from_state, to_state) process transitions.
    Returns True if valid, False otherwise.
    """
    valid_map = {
        "NEW": {"READY"},
        "READY": {"RUNNING"},
        "RUNNING": {"WAITING", "READY", "TERMINATED"},
        "WAITING": {"READY"},
        "TERMINATED": set(),
    }
    
    current_state = "NEW"
    for from_s, to_s in transitions:
        if from_s != current_state:
            return False
        if to_s not in valid_map.get(from_s, set()):
            return False
        current_state = to_s
        
    return True
`,
      sampleTests: [
        { input: 'transitions = [("NEW", "READY"), ("READY", "RUNNING"), ("RUNNING", "TERMINATED")]', expected: 'True' },
        { input: 'transitions = [("NEW", "RUNNING")]', expected: 'False' },
        { input: 'transitions = [("NEW", "READY"), ("READY", "RUNNING"), ("RUNNING", "WAITING"), ("WAITING", "READY")]', expected: 'True' },
      ],
      hiddenTestsCount: 15,
      vivaQuestion: 'Explain why a process cannot transition directly from WAITING back to RUNNING without passing through the READY queue first.',
    },
  },

  os_scheduling: {
    id: 'c_os_scheduling',
    name: 'Processes, Threads & CPU Scheduling Algorithms',
    module: 'Module 2: Concurrency & Process Scheduling',
    prerequisite: 'Operating System Fundamentals & Kernel Architecture',
    prerequisiteReview: 'Process states, Program Counter management, and Process Control Block (PCB) register snapshots.',
    diagramType: 'tree',
    complexities: {
      fcfs: 'O(N) scheduling queue / high turnaround variability (Convoy effect)',
      sjf: 'O(N log N) optimal average waiting time (Unrealizable without future prediction)',
      roundRobin: 'O(1) dispatch per slice / bounded maximum response time',
      priority: 'O(log N) heap dispatch / requires aging to prevent starvation',
    },
    text: `CPU Scheduling is the process by which the operating system decides which READY process is allocated CPU execution time when multiple processes compete for execution.

1. Scheduling Criteria & Metrics:
- CPU Utilization: Percentage of time the CPU is performing useful work (target 40-90%).
- Throughput: Number of processes completed per unit of time.
- Turnaround Time: Total elapsed time from process arrival to complete termination:
      TurnaroundTime = CompletionTime - ArrivalTime
- Waiting Time: Total duration a process spends waiting inside the READY queue:
      WaitingTime = TurnaroundTime - BurstTime
- Response Time: Time from arrival until the first CPU execution slice begins.

2. Classic Scheduling Algorithms:
- First-Come, First-Served (FCFS): Non-preemptive FIFO queue. Simple but suffers from the Convoy Effect where small CPU-burst processes stall behind a massive compute-heavy job.
- Shortest Job First (SJF / SRTF): Schedules the process with the shortest CPU burst. Mathematically proven to minimize average waiting time, but susceptible to Starvation of long bursts.
- Round Robin (RR): Preemptive time-sharing scheduler. Each process receives a fixed Time Quantum (q). If the process burst exceeds q, the OS timer interrupt triggers preemption, appending the process to the tail of the READY queue.
  - If q is excessively large: Degrades to FCFS.
  - If q is excessively small: Context switch overhead dominates execution.`,

    asciiDiagram: `
+---------------------------------------------------------------+
|              ROUND ROBIN CPU TIME-QUANTUM SLICE               |
+---------------------------------------------------------------+
  Ready Queue: [ P1 (Burst: 8) ] -> [ P2 (Burst: 4) ] -> [ P3 (Burst: 2) ]
  Time Quantum: q = 4ms

  Timeline:
  0ms        4ms        8ms       10ms              14ms (P1 Completes)
  +----------+----------+---------+-----------------+
  |    P1    |    P2    |   P3    |       P1        |
  +----------+----------+---------+-----------------+
             ^          ^         ^
             Preempt P1 P2 Done   P3 Done (Runs 2ms)
`,

    example: `# Round Robin CPU Scheduling Simulation
def calculate_round_robin_metrics(processes, quantum):
    """
    processes: list of dicts with 'pid', 'arrival', 'burst'
    """
    time = 0
    queue = []
    remaining_burst = {p['pid']: p['burst'] for p in processes}
    completion = {}
    arrived = sorted(processes, key=lambda x: x['arrival'])
    idx = 0
    
    while idx < len(arrived) or queue:
        while idx < len(arrived) and arrived[idx]['arrival'] <= time:
            queue.append(arrived[idx]['pid'])
            idx += 1
            
        if not queue:
            time = arrived[idx]['arrival']
            continue
            
        current_pid = queue.pop(0)
        exec_time = min(quantum, remaining_burst[current_pid])
        time += exec_time
        remaining_burst[current_pid] -= exec_time
        
        while idx < len(arrived) and arrived[idx]['arrival'] <= time:
            queue.append(arrived[idx]['pid'])
            idx += 1
            
        if remaining_burst[current_pid] > 0:
            queue.append(current_pid)
        else:
            completion[current_pid] = time
            
    # Calculate average turnaround and waiting times
    metrics = []
    for p in processes:
        pid = p['pid']
        tat = completion[pid] - p['arrival']
        wt = tat - p['burst']
        metrics.append({'pid': pid, 'tat': tat, 'wt': wt})
    return metrics

# Test trace
procs = [
    {'pid': 'P1', 'arrival': 0, 'burst': 8},
    {'pid': 'P2', 'arrival': 1, 'burst': 4},
]
print("RR Metrics (q=4):", calculate_round_robin_metrics(procs, 4))`,

    objectives: [
      'Calculate turnaround time and waiting time formulas given process arrival and burst sets',
      'Explain the Convoy Effect in First-Come, First-Served (FCFS) scheduling',
      'Analyze Round Robin time-quantum tradeoffs between response time and context switch latency',
      'Prevent process starvation in priority scheduling using aging mechanisms',
    ],

    misconceptions: [
      'Thinking a smaller Round Robin time quantum always improves system throughput',
      'Assuming Shortest Job First can easily be implemented in general OS kernels without estimating future bursts',
      'Confusing turnaround time (arrival to finish) with waiting time (ready queue duration)',
    ],

    keyTakeaways: [
      'Round Robin guarantees bounded response time for interactive user systems',
      'The time quantum must be substantially larger than the context switch latency (~10x-100x)',
      'Preemptive scheduling relies on hardware timer interrupts to reclaim control from running threads',
    ],

    quizzes: [
      {
        id: 'q_os_06',
        title: 'The Convoy Effect in FCFS',
        prompt: 'What causes the Convoy Effect in First-Come, First-Served (FCFS) CPU scheduling?',
        options: [
          'Multiple short, I/O-bound processes waiting behind a single long, CPU-bound process, causing low device utilization',
          'Network packet collision on the physical Ethernet bus',
          'Two threads simultaneously attempting to acquire the same mutex lock',
          'The CPU instruction cache overflowing into disk swap space',
        ],
        correct: 0,
        explanation: 'In FCFS, if a compute-heavy process runs for a long burst, all subsequent lightweight I/O processes remain blocked in the READY queue, leaving disks and GPUs idle.',
      },
      {
        id: 'q_os_07',
        title: 'Turnaround Time Calculation',
        prompt: 'A process arrives at time t=2, requires 6ms of CPU burst, and completes at time t=14. What is its turnaround time and waiting time?',
        options: [
          'Turnaround Time = 12ms (14 - 2), Waiting Time = 6ms (12 - 6)',
          'Turnaround Time = 14ms, Waiting Time = 8ms',
          'Turnaround Time = 6ms, Waiting Time = 2ms',
          'Turnaround Time = 8ms, Waiting Time = 0ms',
        ],
        correct: 0,
        explanation: 'Turnaround Time = Completion - Arrival = 14 - 2 = 12ms. Waiting Time = Turnaround - Burst = 12 - 6 = 6ms.',
      },
      {
        id: 'q_os_08',
        title: 'Round Robin Quantum Boundary Extremes',
        prompt: 'If the Round Robin time quantum is set to infinity (or a value greater than any process burst length), what algorithm does it effectively become?',
        options: [
          'First-Come, First-Served (FCFS)',
          'Shortest Remaining Time First (SRTF)',
          'Multi-Level Feedback Queue (MLFQ)',
          'Earliest Deadline First (EDF)',
        ],
        correct: 0,
        explanation: 'With an infinite quantum, no running process is ever preempted by the timer interrupt before completing its burst, matching FCFS behavior.',
      },
      {
        id: 'q_os_09',
        title: 'Priority Inversion and Starvation Mitigation',
        prompt: 'How does an operating system kernel prevent low-priority processes from experiencing indefinite starvation in priority scheduling?',
        options: [
          'Aging: Gradually increasing the priority of processes that wait in the ready queue over time',
          'Terminating low-priority processes after 5 seconds',
          'Disabling interrupts globally across all CPU cores',
          'Allocating a dedicated physical CPU core to every single process',
        ],
        correct: 0,
        explanation: 'Aging ensures that as a process waits longer in the ready queue, its effective priority increases gradually, guaranteeing it will eventually win CPU scheduling.',
      },
      {
        id: 'q_os_10',
        title: 'Hardware Timer Interrupt Mechanism',
        prompt: 'What hardware component enables preemptive scheduling in modern multitasking operating systems?',
        options: [
          'A programmable interval timer generating periodic hardware interrupts to transfer CPU control to the scheduler',
          'A dedicated hardware coprocessor running inside the RAM chips',
          'The physical keyboard controller interrupt handler',
          'The BIOS/UEFI read-only memory chip',
        ],
        correct: 0,
        explanation: 'The programmable hardware timer fires periodic interrupts (e.g. every 1-10ms), returning CPU control to the OS kernel so it can evaluate time quantum expiration and enforce preemption.',
      },
    ],

    codingAssessment: {
      id: 'ca_os_02',
      title: 'Round Robin Average Waiting Time Calculator',
      difficulty: 'Medium',
      concept: 'Processes, Threads & CPU Scheduling Algorithms',
      description: `Given a list of process burst times and a fixed time quantum 'q', calculate the average waiting time for all processes under Round Robin scheduling.
Assume all processes arrive simultaneously at time t = 0 in the order given by 'bursts'.

Return the average waiting time as a float rounded to 2 decimal places.

Example:
bursts = [5, 3, 2], q = 2
Execution timeline:
- P0 runs 2 (rem: 3)
- P1 runs 2 (rem: 1)
- P2 runs 2 (rem: 0, finishes at t=6)
- P0 runs 2 (rem: 1)
- P1 runs 1 (rem: 0, finishes at t=9)
- P0 runs 1 (rem: 0, finishes at t=10)

Wait times:
P2: 6 - 2 = 4
P1: 9 - 3 = 6
P0: 10 - 5 = 5
Average: (4 + 6 + 5) / 3 = 5.0`,
      constraints: 'O(N * (max_burst / q)) Time | O(N) Space | Accurate Waiting Time Computation',
      starterCode: `def round_robin_avg_wait(bursts: list[int], q: int) -> float:
    """
    Computes the average waiting time for processes arriving at t=0 with quantum q.
    """
    n = len(bursts)
    if n == 0:
        return 0.0
        
    rem_burst = list(bursts)
    current_time = 0
    waiting_times = [0] * n
    
    while True:
        done = True
        for i in range(n):
            if rem_burst[i] > 0:
                done = False
                if rem_burst[i] > q:
                    current_time += q
                    rem_burst[i] -= q
                else:
                    current_time += rem_burst[i]
                    waiting_times[i] = current_time - bursts[i]
                    rem_burst[i] = 0
        if done:
            break
            
    return round(sum(waiting_times) / n, 2)
`,
      sampleTests: [
        { input: 'bursts = [5, 3, 2], q = 2', expected: '5.0' },
        { input: 'bursts = [4, 4, 4], q = 2', expected: '6.0' },
      ],
      hiddenTestsCount: 15,
      vivaQuestion: 'Explain why Round Robin provides optimal response time for interactive systems but may result in higher average turnaround time compared to SJF.',
    },
  },

  os_memory: {
    id: 'c_os_memory',
    name: 'Memory Management, Paging & Virtual Memory',
    module: 'Module 3: Virtual Memory & Page Translation',
    prerequisite: 'Processes, Threads & CPU Scheduling Algorithms',
    prerequisiteReview: 'Memory address spaces, base and limit registers, cache memory hierarchies.',
    diagramType: 'array',
    complexities: {
      addressTranslation: 'O(1) MMU hardware page lookup / TLB cache hit (~1ns)',
      pageFault: 'O(1) disk I/O interrupt penalty (~5-10ms)',
      lruReplacement: 'O(1) hash map + doubly linked list cache eviction',
      internalFragmentation: 'Bounded by page size (Average PageSize / 2)',
    },
    text: `Virtual Memory is an abstraction mechanism that separates logical memory addresses referenced by programs from actual physical memory (RAM).

1. Paging & Address Translation Mechanics:
The Memory Management Unit (MMU) divides virtual memory into fixed-size blocks called Pages (typically 4KB in x86-64), and physical memory into identical blocks called Frames:
- A virtual address consists of a Page Number (p) and a Page Offset (d):
      VirtualAddress = (PageNumber * PageSize) + Offset
- The MMU indexes the Page Table using Page Number (p) to retrieve the Frame Number (f).
- Physical address is synthesized as:
      PhysicalAddress = (FrameNumber * PageSize) + Offset

2. Translation Lookaside Buffer (TLB):
Multi-level page tables require multiple memory lookups per access. The CPU uses an associative hardware cache called the TLB to cache recent virtual-to-physical mappings:
      EffectiveAccessTime (EAT) = (TLB_HitRate * (TLB_Access + RAM_Access)) + ((1 - TLB_HitRate) * (TLB_Access + 2 * RAM_Access))

3. Demand Paging & Page Replacement Algorithms:
Under demand paging, pages are loaded into RAM only when accessed. If a program references a page whose Valid/Invalid bit is 0, the CPU triggers a Page Fault Exception:
- OS traps to kernel, identifies a free frame in physical RAM (or evicts a victim frame).
- Page Replacement Algorithms determine which page to evict:
  - FIFO: Evicts the oldest loaded page. Suffers from Belady's Anomaly (allocating more frames can paradoxically increase page faults).
  - Least Recently Used (LRU): Evicts the page that has not been accessed for the longest time period. Optimal realizable approximation of Belady's theoretical MIN.`,

    asciiDiagram: `
+---------------------------------------------------------------+
|         HARDWARE MMU VIRTUAL-TO-PHYSICAL ADDRESS TRANSLATION  |
+---------------------------------------------------------------+
  Virtual Address: [ Page Number: p = 2 ] | [ Offset: d = 0x120 ]
                               |
                               v
                     +-------------------+
                     |   TLB CACHE HIT?  |
                     +-------------------+
                       / (Hit)       \\ (Miss)
                      v               v
               Physical Frame f   Page Table Lookup
                                      |
                                  +---+---+
                                  | 0 | 7 |
                                  | 1 | 3 |
                                  | 2 | 9 | -> Frame f = 9
                                  +---+---+
                                      |
  Physical Address: [ Frame f = 9 ] | [ Offset: d = 0x120 ] -> Physical RAM
`,

    example: `# Least Recently Used (LRU) Page Replacement Simulation
class LRUPageReplacement:
    def __init__(self, capacity):
        self.capacity = capacity
        self.frames = []
        self.page_faults = 0

    def access_page(self, page):
        if page in self.frames:
            # Hit: Move page to most recently used position
            self.frames.remove(page)
            self.frames.append(page)
            return False  # No page fault
        else:
            # Fault: Evict oldest if full
            self.page_faults += 1
            if len(self.frames) >= self.capacity:
                self.frames.pop(0) # Evict LRU page at head
            self.frames.append(page)
            return True   # Page fault occurred

# Trace
lru = LRUPageReplacement(capacity=3)
page_references = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3]
faults = sum(1 for p in page_references if lru.access_page(p))
print("Total page faults:", faults) # 8
print("Final Resident Frames in RAM:", lru.frames)`,

    objectives: [
      'Translate virtual memory addresses to physical addresses using page numbers and offsets',
      'Calculate Effective Access Time (EAT) given TLB hit ratios and memory latency',
      'Implement Least Recently Used (LRU) page replacement in constant O(1) time',
      "Analyze Belady's Anomaly in First-In-First-Out (FIFO) page replacement",
    ],

    misconceptions: [
      "Believing adding more physical RAM frames to a system always decreases page faults under any algorithm (Belady's Anomaly proves FIFO violates this)",
      'Assuming the page offset changes during address translation (offset is strictly preserved)',
      'Thinking virtual memory allows programs to exceed physical memory limits without disk swap overhead',
    ],

    keyTakeaways: [
      'Paging eliminates external fragmentation by using fixed-size blocks (pages and frames)',
      'The TLB cache is critical to make virtual memory performant without doubling memory access times',
      'Demand paging enables processes to execute with only their active working set loaded in RAM',
    ],

    quizzes: [
      {
        id: 'q_os_11',
        title: 'Virtual to Physical Address Translation',
        prompt: 'In a paging system with 4KB (4096 bytes) pages, what is the page number and page offset for virtual address 9000?',
        options: [
          'Page Number = 2, Page Offset = 808 (9000 = 2 * 4096 + 808)',
          'Page Number = 9, Page Offset = 000',
          'Page Number = 1, Page Offset = 4904',
          'Page Number = 4, Page Offset = 2',
        ],
        correct: 0,
        explanation: 'Page Number = floor(9000 / 4096) = 2. Offset = 9000 mod 4096 = 808. The MMU looks up frame for page 2 and appends offset 808.',
      },
      {
        id: 'q_os_12',
        title: "Belady's Anomaly in Page Replacement",
        prompt: "What is Belady's Anomaly in memory management?",
        options: [
          'A phenomenon where increasing the number of physical frames increases the number of page faults under FIFO replacement',
          'A crash that occurs when the TLB cache overheats',
          'A deadlock caused by two processes sharing the same virtual memory page',
          'When internal fragmentation exceeds 90% of total RAM capacity',
        ],
        correct: 0,
        explanation: 'Belady discovered that for certain page reference strings, First-In-First-Out (FIFO) eviction experiences more page faults when given 4 frames than when given 3 frames. Stack algorithms like LRU never suffer from this.',
      },
      {
        id: 'q_os_13',
        title: 'Effective Access Time (EAT) with TLB',
        prompt: 'If TLB search time is 10ns, RAM access time is 100ns, and TLB hit ratio is 90%, what is the Effective Access Time (EAT)?',
        options: [
          '120ns (0.90 * (10 + 100) + 0.10 * (10 + 100 + 100))',
          '100ns',
          '200ns',
          '10ns',
        ],
        correct: 0,
        explanation: 'On TLB hit (90%): 10ns (TLB) + 100ns (RAM) = 110ns. On TLB miss (10%): 10ns (TLB) + 100ns (Page Table) + 100ns (RAM) = 210ns. EAT = 0.90 * 110 + 0.10 * 210 = 99 + 21 = 120ns.',
      },
      {
        id: 'q_os_14',
        title: 'Internal vs External Fragmentation',
        prompt: 'Which statement accurately describes fragmentation in a purely paged memory system?',
        options: [
          'External fragmentation is completely eliminated, but internal fragmentation occurs within the final page of an allocation',
          'Internal fragmentation is eliminated, but external fragmentation causes scattered memory gaps',
          'Both internal and external fragmentation are 100% eliminated',
          'Fragmentation only occurs when using solid-state drives instead of magnetic hard drives',
        ],
        correct: 0,
        explanation: 'Because any free frame in physical memory can be allocated to any process, external fragmentation does not exist. However, if a program requires 4097 bytes, it receives two 4096-byte pages, wasting 4095 bytes in the second page (internal fragmentation).',
      },
      {
        id: 'q_os_15',
        title: 'Thrashing in Virtual Memory',
        prompt: 'What is Thrashing in an operating system?',
        options: [
          'A state where the system spends more time servicing page faults and swapping pages than executing instructions',
          'When a CPU core executes at 100% thermal throttle limits',
          'When an infinite loop executes inside user mode',
          'A hardware bus synchronization conflict between memory channels',
        ],
        correct: 0,
        explanation: 'Thrashing occurs when the sum of active working sets of all processes exceeds physical RAM. Pages are continuously evicted and immediately faulted back in, collapsing throughput to near zero.',
      },
    ],

    codingAssessment: {
      id: 'ca_os_03',
      title: 'LRU Page Replacement Cache Simulator',
      difficulty: 'Medium',
      concept: 'Memory Management, Paging & Virtual Memory',
      description: `Implement a Least Recently Used (LRU) Page Replacement simulator.

Given the capacity of physical RAM frames and a sequence of referenced page numbers 'pages':
Simulate the LRU page replacement algorithm and return the total number of page faults that occur.

Rules:
- If a page is already present in a frame, it is a HIT (no page fault); that page becomes the most recently used.
- If a page is not present and frames are available, allocate a free frame (PAGE FAULT).
- If a page is not present and all frames are full, evict the least recently used page and replace it (PAGE FAULT).`,
      constraints: 'O(N) Time | O(capacity) Memory | Standard LRU Eviction Logic',
      starterCode: `def count_lru_page_faults(capacity: int, pages: list[int]) -> int:
    """
    Simulates LRU page replacement and returns the total count of page faults.
    """
    if capacity <= 0 or not pages:
        return 0
        
    frames = []
    faults = 0
    
    for page in pages:
        if page in frames:
            frames.remove(page)
            frames.append(page)
        else:
            faults += 1
            if len(frames) >= capacity:
                frames.pop(0)
            frames.append(page)
            
    return faults
`,
      sampleTests: [
        { input: 'capacity = 3, pages = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3]', expected: '8' },
        { input: 'capacity = 4, pages = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]', expected: '10' },
      ],
      hiddenTestsCount: 15,
      vivaQuestion: "Explain why LRU is classified as a stack algorithm and why stack algorithms are mathematically immune to Belady's Anomaly.",
    },
  },
};

export const OOP_TOPICS_DATABASE = {
  oop_classes: {
    id: 'c_oop_classes',
    name: 'Classes, Objects & Encapsulation Invariants',
    module: 'Module 1: Encapsulation & Object State Invariants',
    prerequisite: 'Imperative Programming & Structured Types',
    prerequisiteReview: 'Variables, primitive datatypes, functions, parameter passing (by value vs by reference), and memory scopes (stack vs heap).',
    diagramType: 'tree',
    complexities: {
      instantiation: 'O(1) heap allocation + constructor initialization',
      fieldAccess: 'O(1) memory offset pointer dereferencing',
      encapsulation: 'Compile-time access level enforcement (private, protected, public)',
      stateGuard: 'O(1) assertion checking inside mutator methods',
    },
    text: `Object-Oriented Programming (OOP) models software systems around stateful entities called Objects, instantiated from user-defined blueprints called Classes.

1. Classes vs Objects:
- A Class is an immutable compile-time definition specifying fields (state) and methods (behavior).
- An Object is a dynamic instance of a class allocated in memory (typically on the Heap). The variable holding the object stores a memory reference (pointer) to the heap allocation.

2. Encapsulation & Information Hiding:
Encapsulation bundles data attributes and the functions that manipulate that data into a single autonomous unit while restricting direct external access to internal state:
- Private fields ('private' or '#' in JS/TS, private in C++/Java) prevent outside code from corrupting internal state.
- Mutators (Setters) and Accessors (Getters) enforce Class Invariants — rules that must always hold true throughout the object's lifetime (e.g., bank account balance >= 0).

3. Constructors & Lifecycle Invariants:
Constructors ensure that an object is never in an invalid, uninitialized state. They validate arguments before assigning values to private fields and allocate required system resources.`,

    asciiDiagram: `
+---------------------------------------------------------------+
|         OBJECT MEMORY LAYOUT & ENCAPSULATION BOUNDARY         |
+---------------------------------------------------------------+
  [ STACK FRAME ]                     [ HEAP ALLOCATION ]
  +------------------+                +-------------------------+
  | Ref: accountPtr  | -------------> | Class Type: BankAccount |
  +------------------+                +-------------------------+
                                      | [PRIVATE] _accountNo: 101|
                                      | [PRIVATE] _balance: 500 | <- Invariant: >= 0
                                      +-------------------------+
                                      | [PUBLIC] deposit(amt)   |
                                      | [PUBLIC] withdraw(amt)  |
                                      +-------------------------+
`,

    example: `// Encapsulation and Class Invariants Implementation
class BankAccount {
  #accountNumber;
  #balance;

  constructor(accountNumber, initialDeposit = 0) {
    if (!accountNumber || typeof accountNumber !== 'string') {
      throw new Error("Invalid account number");
    }
    if (initialDeposit < 0) {
      throw new Error("Initial deposit cannot be negative");
    }
    this.#accountNumber = accountNumber;
    this.#balance = initialDeposit;
  }

  get balance() {
    return this.#balance;
  }

  deposit(amount) {
    if (amount <= 0) {
      throw new Error("Deposit amount must be strictly positive");
    }
    this.#balance += amount;
    return this.#balance;
  }

  withdraw(amount) {
    if (amount <= 0) {
      throw new Error("Withdrawal amount must be strictly positive");
    }
    // Enforce Class Invariant: balance must never drop below 0
    if (this.#balance - amount < 0) {
      throw new Error("Insufficient funds: Invariant violation");
    }
    this.#balance -= amount;
    return this.#balance;
  }
}

// Verification Trace
const acc = new BankAccount("AC-9812", 200);
acc.deposit(100);
console.log("Balance after deposit:", acc.balance); // 300
acc.withdraw(50);
console.log("Balance after withdrawal:", acc.balance); // 250`,

    objectives: [
      'Define classes with private state attributes and public mutator methods',
      'Enforce class invariants through constructors and setter boundary validation',
      'Distinguish heap-allocated object identity from stack reference pointers',
      'Explain the dangers of leaking mutable internal references',
    ],

    misconceptions: [
      'Thinking encapsulation merely means writing trivial getter and setter methods for every private field',
      'Believing objects are copied by value during variable assignment rather than sharing reference pointers',
      'Assuming constructors can safely return half-initialized objects when validation checks fail',
    ],

    keyTakeaways: [
      'Encapsulation guarantees that internal invariants cannot be corrupted by external clients',
      'Classes define blueprints; objects are discrete runtime instances with autonomous identity',
      'Private fields establish a clean boundary between implementation details and public API contracts',
    ],

    quizzes: [
      {
        id: 'q_oop_01',
        title: 'Core Purpose of Encapsulation',
        prompt: 'What is the primary architectural purpose of encapsulation in object-oriented design?',
        options: [
          'To protect object internal state from corruption by enforcing invariant validation through controlled methods',
          'To make all variables globally accessible to every function in the codebase',
          'To speed up CPU clock cycles during arithmetic calculations',
          'To automatically convert JavaScript code into compiled C++ machine binaries',
        ],
        correct: 0,
        explanation: 'Encapsulation bundles data and methods while restricting direct field access so that class invariants (e.g. balance >= 0) cannot be bypassed or corrupted by external callers.',
      },
      {
        id: 'q_oop_02',
        title: 'Object Reference Semantics',
        prompt: 'If object variable `b` is assigned to `a` (`let b = a`), what happens in memory?',
        options: [
          'Variable `b` receives a copy of the memory reference pointer; both `a` and `b` reference the same object on the heap',
          'A complete deep copy of all object fields is allocated in a new heap block',
          'The original object in `a` is deleted and moved into `b`',
          'A compilation error occurs because objects cannot be assigned',
        ],
        correct: 0,
        explanation: 'In languages like Java, JavaScript, Python, and C# object variables are reference pointers. Assigning `b = a` copies the reference, pointing both variables to the exact same heap memory.',
      },
      {
        id: 'q_oop_03',
        title: 'Constructor Invariant Enforcement',
        prompt: 'What should a constructor do if provided invalid arguments that would violate class invariants?',
        options: [
          'Throw an exception / error to abort construction and prevent creating a half-initialized invalid object',
          'Silently assign null and continue execution',
          'Print a console log and assign negative random values',
          'Restart the entire computer operating system',
        ],
        correct: 0,
        explanation: 'Constructors must guarantee that every instantiated object is valid. If validation fails, throwing an exception prevents the instantiation of a malformed or corrupt object.',
      },
      {
        id: 'q_oop_04',
        title: 'Static vs Instance Members',
        prompt: 'How do static methods and variables differ from instance methods and variables in a class?',
        options: [
          'Static members belong to the class itself and are shared across all instances; instance members belong to individual objects',
          'Static members can only be called once when the computer boots up',
          'Instance members can never access private variables',
          'Static members are allocated in CPU registers while instance members are stored on disk',
        ],
        correct: 0,
        explanation: 'Static fields exist once per class in memory, shared across all instances. Instance fields are allocated separately inside each instantiated object.',
      },
      {
        id: 'q_oop_05',
        title: 'Preventing Mutable State Leakage',
        prompt: 'If a private field is an Array or Object, why should a getter method return a cloned copy rather than the direct private reference?',
        options: [
          'Returning the direct reference allows external code to mutate internal array elements without going through class methods',
          'Cloning an array is required by the CPU hardware bus architecture',
          'Direct references can only be read once before being erased',
          'JavaScript syntax does not permit returning arrays from getters',
        ],
        correct: 0,
        explanation: 'Returning a direct reference to a private mutable data structure breaks encapsulation because external callers can directly modify elements (e.g. `obj.getItems().clear()`) bypassing all class rules.',
      },
    ],

    codingAssessment: {
      id: 'ca_oop_01',
      title: 'Encapsulated Bank Account Ledger with Invariants',
      difficulty: 'Easy',
      concept: 'Classes, Objects & Encapsulation Invariants',
      description: `Implement a BankAccount class in Python that strictly enforces the following invariants:
- Constructor: '__init__(self, account_id: str, initial_balance: float = 0.0)'
  - If initial_balance < 0, raise ValueError("Initial balance cannot be negative").
- 'deposit(self, amount: float) -> float'
  - If amount <= 0, raise ValueError("Deposit must be positive").
  - Adds to balance and returns updated balance.
- 'withdraw(self, amount: float) -> float'
  - If amount <= 0, raise ValueError("Withdrawal must be positive").
  - If amount > balance, raise ValueError("Insufficient funds").
  - Deducts from balance and returns updated balance.
- 'get_balance(self) -> float'
  - Returns current balance.`,
      constraints: 'O(1) Method Latency | Strict Invariant Validation | Clean Encapsulation',
      starterCode: `class BankAccount:
    def __init__(self, account_id: str, initial_balance: float = 0.0):
        if initial_balance < 0:
            raise ValueError("Initial balance cannot be negative")
        self._account_id = account_id
        self._balance = float(initial_balance)
        
    def deposit(self, amount: float) -> float:
        if amount <= 0:
            raise ValueError("Deposit must be positive")
        self._balance += amount
        return self._balance
        
    def withdraw(self, amount: float) -> float:
        if amount <= 0:
            raise ValueError("Withdrawal must be positive")
        if amount > self._balance:
            raise ValueError("Insufficient funds")
        self._balance -= amount
        return self._balance
        
    def get_balance(self) -> float:
        return self._balance
`,
      sampleTests: [
        { input: 'acc = BankAccount("1", 100); acc.deposit(50); acc.withdraw(30); acc.get_balance()', expected: '120.0' },
        { input: 'acc = BankAccount("2", 50); acc.withdraw(100)', expected: 'ValueError: Insufficient funds' },
      ],
      hiddenTestsCount: 15,
      vivaQuestion: 'Explain why keeping the _balance field private and validating deposits and withdrawals preserves class integrity against concurrency and race condition defects.',
    },
  },

  oop_inheritance: {
    id: 'c_oop_inheritance',
    name: 'Inheritance, Abstract Classes & Method Overriding',
    module: 'Module 2: Class Hierarchies & Code Reuse',
    prerequisite: 'Classes, Objects & Encapsulation Invariants',
    prerequisiteReview: 'Class definitions, object constructors, and instance method invocation.',
    diagramType: 'tree',
    complexities: {
      hierarchyDepth: 'Target <= 3 levels to avoid fragile base class problem',
      superDispatch: 'O(1) prototype / parent constructor chain',
      overriding: 'O(1) method shadow replacement in child scope',
      typeCheck: 'O(1) instanceof / issubclass type inspection',
    },
    text: `Inheritance is a fundamental OOP mechanism allowing a Child (Subclass) to inherit fields and methods from a Parent (Superclass), establishing an "Is-A" semantic relationship.

1. Code Reuse vs Fragile Base Class:
Inheritance promotes code reuse by centralizing common behavior in base classes. However, deep inheritance hierarchies create the Fragile Base Class antipattern, where modifying a method in a root superclass inadvertently breaks behavior in deeply nested child subclasses.

2. Method Overriding & The 'super' Keyword:
A subclass can provide a specialized implementation of a method defined in its superclass:
- The child method shadows the parent method.
- The child can invoke the parent's base logic using 'super.methodName()' before or after applying specialized behavior.
- Subclass constructors MUST invoke 'super(...)' before accessing 'this'.

3. Abstract Classes:
An Abstract Class is a blueprint that cannot be directly instantiated. It defines abstract methods — contracts that concrete subclasses MUST implement:
- Guarantees uniform interface compliance across heterogeneous domain entities.`,

    asciiDiagram: `
+---------------------------------------------------------------+
|         INHERITANCE CLASS HIERARCHY & METHOD OVERRIDING       |
+---------------------------------------------------------------+
                 [ ABSTRACT SUPERCLASS: Vehicle ]
                 - brand: string
                 - speed: float
                 + startEngine(): void
                 + calculateRange(): float [ABSTRACT]
                                ^
                                |  (Extends / Inherits)
            +-------------------+-------------------+
            |                                       |
    [ Concrete: ElectricCar ]               [ Concrete: GasTruck ]
    - batteryCapacity: kWh                  - fuelTank: Gallons
    + calculateRange() [OVERRIDDEN]         + calculateRange() [OVERRIDDEN]
    + chargeBattery(): void                 + refuel(): void
`,

    example: `// Abstract Class and Method Overriding Implementation
class Vehicle {
  constructor(brand, model) {
    if (new.target === Vehicle) {
      throw new Error("Cannot instantiate abstract class Vehicle directly.");
    }
    this.brand = brand;
    this.model = model;
  }

  // Abstract method contract
  calculateRange() {
    throw new Error("Abstract method 'calculateRange' must be implemented by subclass.");
  }

  getInfo() {
    return \`\${this.brand} \${this.model} (Range: \${this.calculateRange()} km)\`;
  }
}

class ElectricVehicle extends Vehicle {
  constructor(brand, model, batteryKWh, efficiencyKmPerKWh) {
    super(brand, model);
    this.batteryKWh = batteryKWh;
    this.efficiency = efficiencyKmPerKWh;
  }

  // Override abstract method
  calculateRange() {
    return this.batteryKWh * this.efficiency;
  }
}

// Verification Trace
const ev = new ElectricVehicle("Tesla", "Model 3", 75, 6.5);
console.log(ev.getInfo()); // Tesla Model 3 (Range: 487.5 km)`,

    objectives: [
      'Design class hierarchies establishing valid "Is-A" semantic relationships',
      'Override superclass methods while preserving parent behavior via super calls',
      'Declare abstract classes and enforce concrete subclass method implementations',
      'Identify and prevent the Fragile Base Class antipattern',
    ],

    misconceptions: [
      'Using inheritance purely to share convenience helper functions rather than establishing genuine Is-A relationships (Composition should be favored for Has-A)',
      'Forgetting that child constructors must invoke super() before accessing this in JavaScript and Java',
      'Assuming private members of a parent class can be directly accessed in a subclass without getter/setter methods',
    ],

    keyTakeaways: [
      'Inheritance models "Is-A" relationships; composition models "Has-A" relationships',
      'Method overriding enables polymorphic specialization while preserving superclass contracts',
      'Abstract classes provide enforceable templates that prevent incomplete entity instantiation',
    ],

    quizzes: [
      {
        id: 'q_oop_06',
        title: 'Is-A vs Has-A Relationship Design',
        prompt: 'Which scenario represents a correct use of Inheritance (Is-A) rather than Composition (Has-A)?',
        options: [
          'A `Sparrow` class extending a `Bird` class (A Sparrow is a Bird)',
          'A `Car` class extending an `Engine` class (A Car has an Engine)',
          'A `House` class extending a `Door` class (A House has a Door)',
          'A `Computer` class extending a `Keyboard` class (A Computer has a Keyboard)',
        ],
        correct: 0,
        explanation: 'Inheritance strictly represents an "Is-A" relationship: a Sparrow IS a Bird. A Car HAS an Engine, so Car should contain an Engine instance (Composition), not inherit from it.',
      },
      {
        id: 'q_oop_07',
        title: 'The Super Keyword Role',
        prompt: 'What is the purpose of invoking `super(...)` inside a subclass constructor?',
        options: [
          'To initialize the inherited fields and execute the constructor logic of the parent superclass',
          'To delete the parent class from physical memory',
          'To convert the subclass into a static method',
          'To prevent garbage collection of the child instance',
        ],
        correct: 0,
        explanation: '`super(...)` delegates argument initialization to the parent superclass constructor, ensuring that base state is completely initialized before child constructor logic runs.',
      },
      {
        id: 'q_oop_08',
        title: 'Abstract Classes Instantiation Rule',
        prompt: 'What occurs if code attempts to directly execute `new AbstractShape()` on an abstract class?',
        options: [
          'An error/exception is thrown because abstract classes cannot be instantiated directly',
          'The CPU allocates an empty zero-byte object and ignores all method calls',
          'The abstract class automatically picks a random subclass to instantiate',
          'The operating system crashes with a kernel panic',
        ],
        correct: 0,
        explanation: 'Abstract classes are incomplete architectural templates containing abstract methods without bodies. Direct instantiation is prohibited by language compilers and runtimes.',
      },
      {
        id: 'q_oop_09',
        title: 'The Fragile Base Class Antipattern',
        prompt: 'What is the "Fragile Base Class" problem in object-oriented software engineering?',
        options: [
          'A situation where seemingly safe modifications to a base class unintentionally break the behavior of derived subclasses',
          'When a base class runs out of RAM memory',
          'When multiple classes have the exact same name in different folders',
          'When an abstract class has zero methods defined',
        ],
        correct: 0,
        explanation: 'Because subclasses tightly couple to the internal implementation details of their superclass, modifying base class behavior or method dispatch order can ripple unexpected breaking changes into subclasses.',
      },
      {
        id: 'q_oop_10',
        title: 'Method Overriding Signature Consistency',
        prompt: 'When overriding a method in a subclass, what must be true about the overridden method contract?',
        options: [
          'It must accept compatible parameters and return a compatible type without tightening precondition constraints',
          'It must have a completely different name than the parent method',
          'It must take twice as many arguments as the parent method',
          'It must be declared private in the child class',
        ],
        correct: 0,
        explanation: 'Under Liskov Substitution principles, an overridden method must maintain interface compatibility with the parent method so callers can invoke it without knowing the specific subclass type.',
      },
    ],

    codingAssessment: {
      id: 'ca_oop_02',
      title: 'Hierarchical Employee Payroll Calculator',
      difficulty: 'Medium',
      concept: 'Inheritance, Abstract Classes & Method Overriding',
      description: `Implement an Employee inheritance hierarchy in Python:

1. Base Class: 'Employee'
   - '__init__(self, emp_id: str, name: str, base_salary: float)'
   - 'calculate_pay(self) -> float': returns base_salary.

2. Subclass: 'SalariedEmployee(Employee)'
   - Inherits from Employee.
   - Overrides 'calculate_pay(self) -> float': returns base_salary.

3. Subclass: 'HourlyEmployee(Employee)'
   - '__init__(self, emp_id: str, name: str, hourly_rate: float, hours_worked: float)'
   - Overrides 'calculate_pay(self) -> float':
     - Regular pay for hours <= 40: hours * hourly_rate
     - Overtime pay for hours > 40: (40 * hourly_rate) + ((hours - 40) * hourly_rate * 1.5)

4. Subclass: 'CommissionEmployee(Employee)'
   - '__init__(self, emp_id: str, name: str, base_salary: float, commission_sales: float, commission_rate: float)'
   - Overrides 'calculate_pay(self) -> float':
     - base_salary + (commission_sales * commission_rate)`,
      constraints: 'O(1) Calculation | Proper Superclass Constructor Chaining | Polymorphic Dispatch',
      starterCode: `class Employee:
    def __init__(self, emp_id: str, name: str, base_salary: float):
        self.emp_id = emp_id
        self.name = name
        self.base_salary = float(base_salary)
        
    def calculate_pay(self) -> float:
        return self.base_salary

class SalariedEmployee(Employee):
    pass

class HourlyEmployee(Employee):
    def __init__(self, emp_id: str, name: str, hourly_rate: float, hours_worked: float):
        super().__init__(emp_id, name, base_salary=0.0)
        self.hourly_rate = float(hourly_rate)
        self.hours_worked = float(hours_worked)
        
    def calculate_pay(self) -> float:
        if self.hours_worked <= 40:
            return self.hours_worked * self.hourly_rate
        regular = 40 * self.hourly_rate
        overtime = (self.hours_worked - 40) * self.hourly_rate * 1.5
        return regular + overtime

class CommissionEmployee(Employee):
    def __init__(self, emp_id: str, name: str, base_salary: float, commission_sales: float, commission_rate: float):
        super().__init__(emp_id, name, base_salary)
        self.commission_sales = float(commission_sales)
        self.commission_rate = float(commission_rate)
        
    def calculate_pay(self) -> float:
        return self.base_salary + (self.commission_sales * self.commission_rate)
`,
      sampleTests: [
        { input: 'e = SalariedEmployee("1", "Alice", 5000); e.calculate_pay()', expected: '5000.0' },
        { input: 'e = HourlyEmployee("2", "Bob", 20, 45); e.calculate_pay()', expected: '950.0' },
        { input: 'e = CommissionEmployee("3", "Carol", 2000, 10000, 0.1); e.calculate_pay()', expected: '3000.0' },
      ],
      hiddenTestsCount: 15,
      vivaQuestion: 'Explain why payroll systems benefit from polymorphic calculate_pay methods, allowing the company to process payroll without needing if/else type checks.',
    },
  },

  oop_polymorphism: {
    id: 'c_oop_polymorphism',
    name: 'Polymorphism, Interfaces & Dynamic Dispatch',
    module: 'Module 3: Polymorphic Design & Virtual Tables',
    prerequisite: 'Inheritance, Abstract Classes & Method Overriding',
    prerequisiteReview: 'Subclassing, method overriding, and super reference invocation.',
    diagramType: 'tree',
    complexities: {
      compileTimePoly: 'O(1) static type resolution (Method Overloading)',
      runTimePoly: 'O(1) VTable pointer indirect jump (Method Overriding)',
      interfaceSegregation: 'Target cohesive, single-responsibility interfaces',
      liskovCompliance: 'Subtypes must be substitutable for base types without breaking invariants',
    },
    text: `Polymorphism ("many forms") is the ability of different objects to respond to the same method invocation in their own unique ways through a shared interface.

1. Compile-Time vs Run-Time Polymorphism:
- Compile-Time (Static) Polymorphism: Achieved via Method Overloading or Generics/Templates. The compiler determines which method variant to invoke at compile time based on parameter types.
- Run-Time (Dynamic) Polymorphism: Achieved via Method Overriding and Interface implementation. The exact method implementation is resolved at runtime based on the actual concrete object type.

2. Virtual Method Tables (VTables) & Dynamic Dispatch:
In compiled object-oriented languages (like C++, Java, C#):
- Each class containing virtual methods possesses an internal array of function pointers called the Virtual Method Table (VTable).
- Every object instance stores an invisible pointer (vptr) pointing to its class's VTable.
- When calling 'shape.draw()', the CPU performs dynamic dispatch:
      Call Target = *(object->vptr + method_offset)
- This indirect jump executes in constant O(1) time without needing slow 'switch' or 'if-else' type checks.

3. The Liskov Substitution Principle (LSP):
Formulated by Barbara Liskov, LSP states: "If S is a subtype of T, then objects of type T may be replaced with objects of type S without altering any desirable properties of the program."
- A subclass must not strengthen preconditions (require more than parent).
- A subclass must not weaken postconditions (guarantee less than parent).
- Classic violation: Making a Square subclass inherit from a Rectangle (mutating width breaks Square height invariant).`,

    asciiDiagram: `
+---------------------------------------------------------------+
|         DYNAMIC DISPATCH & VIRTUAL METHOD TABLE (VTABLE)      |
+---------------------------------------------------------------+
  Client Code:
      Shape* s = new Circle(radius = 5);
      s->area(); // Dynamic Dispatch!

  Memory Representation:
  [ Circle Object in Heap ]           [ Circle VTable in Memory ]
  +-----------------------+           +-------------------------+
  | vptr -----------------|---------> | [0]: &Circle::draw()    |
  | radius = 5.0          |           | [1]: &Circle::area()    | -> Jumps to Circle::area
  +-----------------------+           +-------------------------+
`,

    example: `// Runtime Polymorphism & Dynamic Dispatch Simulation
class Shape {
  area() {
    throw new Error("Must implement area()");
  }
  perimeter() {
    throw new Error("Must implement perimeter()");
  }
}

class Circle extends Shape {
  constructor(radius) {
    super();
    this.radius = radius;
  }
  area() {
    return Math.PI * (this.radius ** 2);
  }
  perimeter() {
    return 2 * Math.PI * this.radius;
  }
}

class Rectangle extends Shape {
  constructor(width, height) {
    super();
    this.width = width;
    this.height = height;
  }
  area() {
    return this.width * this.height;
  }
  perimeter() {
    return 2 * (this.width + this.height);
  }
}

// Polymorphic rendering pipeline: accepts any Shape without type checks
function printTotalCanvasArea(shapes) {
  let total = 0;
  for (const s of shapes) {
    total += s.area(); // Polymorphic dispatch
  }
  return total;
}

// Verification Trace
const shapes = [new Circle(10), new Rectangle(5, 4)];
console.log("Total area across heterogeneous shapes:", printTotalCanvasArea(shapes));`,

    objectives: [
      'Contrast compile-time static polymorphism with run-time dynamic polymorphism',
      'Explain how Virtual Method Tables (VTables) and vptr pointers resolve dynamic dispatch in O(1)',
      'Apply the Liskov Substitution Principle (LSP) to evaluate inheritance hierarchy validity',
      'Design modular processing pipelines that operate on interfaces rather than concrete classes',
    ],

    misconceptions: [
      'Assuming dynamic dispatch requires slow runtime string or if-else type comparisons (VTables use direct O(1) function pointer indexing)',
      'Thinking a Square is always a valid subclass of Rectangle in OOP (violates LSP when mutating width/height independently)',
      'Confusing method overloading (same name, different arguments) with method overriding (same name and arguments, specialized in subclass)',
    ],

    keyTakeaways: [
      'Polymorphism decouples high-level algorithms from low-level concrete implementations',
      'VTables provide deterministic O(1) dynamic method dispatch with minimal runtime memory overhead',
      'Adhering to the Liskov Substitution Principle ensures that derived classes remain truly substitutable',
    ],

    quizzes: [
      {
        id: 'q_oop_11',
        title: 'Compile-Time vs Run-Time Polymorphism',
        prompt: 'Which of the following is an example of Run-Time (Dynamic) Polymorphism?',
        options: [
          'A base class pointer calling an overridden method on a derived subclass instance',
          'Two functions in the same file with the same name taking different numbers of integers (overloading)',
          'A macro preprocessor replacing a constant with `#define MAX 100`',
          'Declaring an integer variable as 32-bit instead of 64-bit',
        ],
        correct: 0,
        explanation: 'Dynamic polymorphism occurs when the runtime resolves which overridden method implementation to execute based on the actual concrete object pointed to by a reference.',
      },
      {
        id: 'q_oop_12',
        title: 'Virtual Method Table (VTable) Mechanics',
        prompt: 'How does an object-oriented runtime achieve constant O(1) time complexity when calling a virtual method through a base pointer?',
        options: [
          'By indexing a fixed offset into the object’s Virtual Method Table (VTable) of function pointers',
          'By performing a linear string search over all source code files',
          'By querying a remote cloud database server',
          'By running an interpreter garbage collection pass',
        ],
        correct: 0,
        explanation: 'Each class has a VTable containing function pointers. At compile time, each virtual method is assigned a fixed index offset. Calling `obj->method()` performs an indirect memory jump through `vptr[offset]`.',
      },
      {
        id: 'q_oop_13',
        title: 'Liskov Substitution Principle (LSP) Violation',
        prompt: 'Why does deriving a `Square` subclass from a `Rectangle` base class frequently violate the Liskov Substitution Principle (LSP)?',
        options: [
          'Because a Rectangle allows setting `width` and `height` independently; setting width on a Square must alter height, violating expected Rectangle behavior',
          'Because Squares cannot be drawn on computer screens',
          'Because mathematical geometry prohibits polygons with 4 sides',
          'Because Rectangles require floating point numbers while Squares only use integers',
        ],
        correct: 0,
        explanation: 'If a client function accepts a `Rectangle` and sets `rect.setWidth(5); rect.setHeight(4);`, it expects `rect.area()` to be 20. If `rect` is a Square that updates both sides to 4, the area becomes 16, breaking client invariant expectations.',
      },
      {
        id: 'q_oop_14',
        title: 'Interface-Based Architecture Advantage',
        prompt: 'What is the primary benefit of programming to an Interface rather than a concrete implementation class?',
        options: [
          'It decouples client code from specific implementations, allowing components to be swapped or mocked in unit tests without modifying callers',
          'It guarantees the program uses zero RAM memory',
          'It disables all computer security firewalls automatically',
          'It removes the need to write unit tests',
        ],
        correct: 0,
        explanation: 'Programming to interfaces creates loose coupling: algorithms depend on abstract contracts. Implementations (e.g. MemoryDatabase vs PostgresDatabase) can be swapped seamlessly.',
      },
      {
        id: 'q_oop_15',
        title: 'Dynamic Type Reflection vs Polymorphism',
        prompt: 'Why is using polymorphic dispatch generally preferred over writing chains of `if (obj instanceof Circle) ... else if (obj instanceof Square)`?',
        options: [
          'Polymorphism satisfies the Open/Closed Principle: new shapes can be added without modifying existing client dispatch code',
          'instanceof checks are illegal in all programming languages',
          'Polymorphism requires less disk space when downloading the application',
          'instanceof operators always delete the variable from memory',
        ],
        correct: 0,
        explanation: 'Type checking chains (`instanceof`) violate the Open/Closed Principle: every time a new subclass is created, every `if/else` block across the codebase must be updated. Polymorphism handles new subclasses automatically.',
      },
    ],

    codingAssessment: {
      id: 'ca_oop_03',
      title: 'Polymorphic Geometric Shape Canvas',
      difficulty: 'Medium',
      concept: 'Polymorphism, Interfaces & Dynamic Dispatch',
      description: `Implement a Polymorphic Shape Canvas in Python.

1. Base Class: 'Shape'
   - Methods: 'area(self) -> float' and 'perimeter(self) -> float' (raise NotImplementedError)

2. Derived Classes:
   - 'Circle(radius: float)'
     - area = pi * r^2
     - perimeter = 2 * pi * r
   - 'Rectangle(width: float, height: float)'
     - area = width * height
     - perimeter = 2 * (width + height)
   - 'Triangle(a: float, b: float, c: float)' (Heron's formula)
     - s = (a + b + c) / 2
     - area = sqrt(s * (s - a) * (s - b) * (s - c))
     - perimeter = a + b + c

3. Function: 'total_canvas_area(shapes: list[Shape]) -> float'
   - Uses polymorphic dispatch to sum and return the total area rounded to 2 decimal places.`,
      constraints: 'O(N) Processing | Pure Polymorphic Dynamic Dispatch | Zero Instanceof Checks',
      starterCode: `import math

class Shape:
    def area(self) -> float:
        raise NotImplementedError
    def perimeter(self) -> float:
        raise NotImplementedError

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = float(radius)
    def area(self) -> float:
        return math.pi * (self.radius ** 2)
    def perimeter(self) -> float:
        return 2 * math.pi * self.radius

class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = float(width)
        self.height = float(height)
    def area(self) -> float:
        return self.width * self.height
    def perimeter(self) -> float:
        return 2 * (self.width + self.height)

class Triangle(Shape):
    def __init__(self, a: float, b: float, c: float):
        self.a = float(a)
        self.b = float(b)
        self.c = float(c)
    def area(self) -> float:
        s = (self.a + self.b + self.c) / 2.0
        return math.sqrt(s * (s - self.a) * (s - self.b) * (s - self.c))
    def perimeter(self) -> float:
        return self.a + self.b + self.c

def total_canvas_area(shapes: list[Shape]) -> float:
    return round(sum(s.area() for s in shapes), 2)
`,
      sampleTests: [
        { input: 'shapes = [Circle(10), Rectangle(5, 4)]; total_canvas_area(shapes)', expected: '334.16' },
        { input: 'shapes = [Rectangle(10, 20), Triangle(3, 4, 5)]; total_canvas_area(shapes)', expected: '206.0' },
      ],
      hiddenTestsCount: 15,
      vivaQuestion: 'Explain how the VTable data structure enables total_canvas_area to compute the area of any shape without needing to know its concrete subclass type at compile time.',
    },
  },
};
