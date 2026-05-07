"""
Synthetic UML Mermaid diagram dataset generator.
Output: CSV + PNG images via mermaid.ink API.
Format: compatible with qwen-vl:2b / unsloth fine-tuning.
"""

import base64
import csv
import os
import time
import requests
from pathlib import Path

IMAGES_DIR = Path("images")
DATA_DIR = Path("data")
IMAGES_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

CSV_PATH = DATA_DIR / "uml_dataset.csv"
CSV_FIELDS = ["id", "diagram_type", "mermaid_code", "description", "entities", "relationships", "image_path"]


def mermaid_to_image(mermaid_code: str, output_path: Path) -> bool:
    encoded = base64.urlsafe_b64encode(mermaid_code.encode("utf-8")).decode("utf-8")
    url = f"https://mermaid.ink/img/{encoded}?type=png&bgColor=white"
    try:
        r = requests.get(url, timeout=20)
        if r.status_code == 200:
            output_path.write_bytes(r.content)
            return True
        print(f"  [WARN] mermaid.ink returned {r.status_code} for {output_path.name}")
    except Exception as e:
        print(f"  [ERROR] {e}")
    return False


# ---------------------------------------------------------------------------
# DIAGRAMS
# ---------------------------------------------------------------------------

DIAGRAMS = [
    # ── CLASS DIAGRAMS ──────────────────────────────────────────────────────
    {
        "id": "class_001",
        "diagram_type": "class",
        "mermaid_code": """\
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
        +move() void
    }
    class Dog {
        +String breed
        +fetch() void
    }
    class Cat {
        +bool isIndoor
        +purr() void
    }
    class Owner {
        +String name
        +String email
        +adopt(animal: Animal) void
    }
    Animal <|-- Dog
    Animal <|-- Cat
    Owner "1" --> "0..*" Animal : owns
""",
        "description": "Class diagram showing an animal ownership system. Animal is the base class with name, age attributes and makeSound/move behaviors. Dog extends Animal adding breed and fetch(). Cat extends Animal adding isIndoor flag and purr(). Owner manages adoption of multiple animals.",
        "entities": "Animal, Dog, Cat, Owner",
        "relationships": "Dog inherits Animal (generalization); Cat inherits Animal (generalization); Owner owns 0..* Animals (association 1-to-many)",
    },
    {
        "id": "class_002",
        "diagram_type": "class",
        "mermaid_code": """\
classDiagram
    class Order {
        +String orderId
        +Date createdAt
        +OrderStatus status
        +calculateTotal() float
        +cancel() void
    }
    class OrderItem {
        +int quantity
        +float unitPrice
        +getSubtotal() float
    }
    class Product {
        +String sku
        +String name
        +float price
        +int stock
    }
    class Customer {
        +String customerId
        +String name
        +String email
        +placeOrder() Order
    }
    class Payment {
        +String paymentId
        +float amount
        +PaymentMethod method
        +process() bool
    }
    Order "1" *-- "1..*" OrderItem : contains
    OrderItem --> Product : references
    Customer "1" --> "0..*" Order : places
    Order "1" --> "1" Payment : paidBy
""",
        "description": "E-commerce order management class diagram. Order aggregates one or more OrderItems, each referencing a Product. Customer places orders. Each Order is associated with one Payment.",
        "entities": "Order, OrderItem, Product, Customer, Payment",
        "relationships": "Order contains 1..* OrderItems (composition); OrderItem references Product (dependency); Customer places 0..* Orders (association); Order paid by Payment (association)",
    },
    {
        "id": "class_003",
        "diagram_type": "class",
        "mermaid_code": """\
classDiagram
    class Vehicle {
        <<abstract>>
        +String plateNumber
        +int year
        +startEngine() void
        +stopEngine() void
    }
    class Car {
        +int doors
        +String fuelType
    }
    class Truck {
        +float payloadTons
        +int axles
    }
    class ElectricCar {
        +int batteryKwh
        +charge() void
    }
    class Rental {
        +Date startDate
        +Date endDate
        +float dailyRate
        +calculateCost() float
    }
    class RentalAgency {
        +String name
        +addVehicle(v: Vehicle) void
        +rentVehicle(id: String) Rental
    }
    Vehicle <|-- Car
    Vehicle <|-- Truck
    Car <|-- ElectricCar
    RentalAgency "1" o-- "0..*" Vehicle : manages
    Rental --> Vehicle : rents
""",
        "description": "Vehicle rental system class diagram. Abstract Vehicle is the root hierarchy. Car and Truck specialize Vehicle; ElectricCar further specializes Car. RentalAgency aggregates Vehicles; Rental references a specific Vehicle.",
        "entities": "Vehicle (abstract), Car, Truck, ElectricCar, Rental, RentalAgency",
        "relationships": "Car inherits Vehicle; Truck inherits Vehicle; ElectricCar inherits Car; RentalAgency aggregates 0..* Vehicles; Rental uses Vehicle",
    },
    {
        "id": "class_004",
        "diagram_type": "class",
        "mermaid_code": """\
classDiagram
    class User {
        +String userId
        +String username
        +String passwordHash
        +login() bool
        +logout() void
    }
    class Role {
        +String roleName
        +List~Permission~ permissions
    }
    class Permission {
        +String resource
        +String action
    }
    class Session {
        +String token
        +Date expiresAt
        +isValid() bool
    }
    class AuditLog {
        +Date timestamp
        +String action
        +String userId
    }
    User "0..*" --> "1..*" Role : hasRole
    Role "1" *-- "1..*" Permission : grants
    User "1" --> "0..*" Session : activeSessions
    User ..> AuditLog : logs
""",
        "description": "RBAC (Role-Based Access Control) class diagram. User holds roles; each Role grants one or more Permissions on resources. User maintains active Sessions. All user actions are recorded in AuditLog.",
        "entities": "User, Role, Permission, Session, AuditLog",
        "relationships": "User has 1..* Roles (association many-to-many); Role contains 1..* Permissions (composition); User has 0..* Sessions; User logs to AuditLog (dependency)",
    },
    {
        "id": "class_005",
        "diagram_type": "class",
        "mermaid_code": """\
classDiagram
    class BankAccount {
        +String accountId
        +float balance
        +deposit(amount: float) void
        +withdraw(amount: float) bool
        +getBalance() float
    }
    class SavingsAccount {
        +float interestRate
        +applyInterest() void
    }
    class CheckingAccount {
        +float overdraftLimit
        +issueCheck() void
    }
    class Transaction {
        +String txId
        +float amount
        +TransactionType type
        +Date date
    }
    class Bank {
        +String name
        +createAccount() BankAccount
        +transfer(from: String, to: String, amount: float) bool
    }
    BankAccount <|-- SavingsAccount
    BankAccount <|-- CheckingAccount
    BankAccount "1" --> "0..*" Transaction : history
    Bank "1" o-- "0..*" BankAccount : holds
""",
        "description": "Banking system class diagram. BankAccount is parent to SavingsAccount and CheckingAccount. Transactions are recorded per account. Bank aggregates all accounts and orchestrates transfers.",
        "entities": "BankAccount, SavingsAccount, CheckingAccount, Transaction, Bank",
        "relationships": "SavingsAccount and CheckingAccount inherit BankAccount; BankAccount has 0..* Transactions (history); Bank aggregates BankAccounts",
    },

    # ── SEQUENCE DIAGRAMS ───────────────────────────────────────────────────
    {
        "id": "seq_001",
        "diagram_type": "sequence",
        "mermaid_code": """\
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API Gateway
    participant Auth as AuthService
    participant DB as Database

    U->>FE: Enter credentials
    FE->>API: POST /login {email, password}
    API->>Auth: validateCredentials(email, password)
    Auth->>DB: SELECT user WHERE email=?
    DB-->>Auth: UserRecord
    Auth-->>API: JWT token
    API-->>FE: 200 OK {token}
    FE-->>U: Redirect to dashboard
""",
        "description": "Login flow sequence diagram. User submits credentials via Frontend to API Gateway. Gateway delegates to AuthService which queries Database. On success, JWT is returned down the chain to the user.",
        "entities": "User, Frontend, API Gateway, AuthService, Database",
        "relationships": "synchronous call chain: User → Frontend → API → Auth → DB; responses propagate back; Auth issues JWT",
    },
    {
        "id": "seq_002",
        "diagram_type": "sequence",
        "mermaid_code": """\
sequenceDiagram
    participant C as Customer
    participant Cart as CartService
    participant Inv as InventoryService
    participant Pay as PaymentService
    participant Not as NotificationService

    C->>Cart: addItem(productId, qty)
    Cart->>Inv: checkStock(productId, qty)
    Inv-->>Cart: available: true
    Cart-->>C: Item added

    C->>Cart: checkout()
    Cart->>Inv: reserveItems(items)
    Inv-->>Cart: reserved
    Cart->>Pay: processPayment(amount, card)
    alt Payment success
        Pay-->>Cart: txId
        Cart->>Not: sendConfirmation(email)
        Cart-->>C: Order confirmed
    else Payment failed
        Pay-->>Cart: error
        Cart->>Inv: releaseReservation(items)
        Cart-->>C: Payment failed
    end
""",
        "description": "E-commerce checkout sequence with alternative flows. Customer adds item (stock checked), then checks out. Inventory is reserved before payment. On success, confirmation is sent. On failure, reservation is released.",
        "entities": "Customer, CartService, InventoryService, PaymentService, NotificationService",
        "relationships": "Cart orchestrates Inventory reservation, Payment processing, and Notification dispatch; alt fragment handles payment success vs failure",
    },
    {
        "id": "seq_003",
        "diagram_type": "sequence",
        "mermaid_code": """\
sequenceDiagram
    participant Dev as Developer
    participant Git as GitHub
    participant CI as CI/CD Pipeline
    participant Reg as Container Registry
    participant K8s as Kubernetes

    Dev->>Git: git push origin main
    Git->>CI: webhook trigger
    CI->>CI: run tests
    CI->>CI: build Docker image
    CI->>Reg: push image:sha
    Reg-->>CI: image digest
    CI->>K8s: kubectl apply deployment.yaml
    K8s->>Reg: pull image
    Reg-->>K8s: image layers
    K8s-->>CI: rollout complete
    CI-->>Dev: Pipeline passed ✓
""",
        "description": "CI/CD pipeline sequence. Developer pushes code to GitHub, triggering the pipeline. Tests run, Docker image is built and pushed to registry. Kubernetes pulls the image and performs a rolling deployment.",
        "entities": "Developer, GitHub, CI/CD Pipeline, Container Registry, Kubernetes",
        "relationships": "push triggers CI; CI builds and pushes image; CI deploys to K8s; K8s pulls from registry; success notification back to developer",
    },
    {
        "id": "seq_004",
        "diagram_type": "sequence",
        "mermaid_code": """\
sequenceDiagram
    participant App as Application
    participant Cache as Redis Cache
    participant DB as PostgreSQL
    participant CDN as CDN

    App->>Cache: GET product:123
    alt Cache hit
        Cache-->>App: product data
    else Cache miss
        Cache-->>App: null
        App->>DB: SELECT * FROM products WHERE id=123
        DB-->>App: product row
        App->>Cache: SET product:123 TTL=300
        Cache-->>App: OK
    end
    App->>CDN: GET image/product_123.jpg
    CDN-->>App: image bytes
""",
        "description": "Cache-aside pattern sequence. Application first queries Redis; on cache miss it falls back to PostgreSQL and repopulates the cache with a 300s TTL. Static images are served directly from CDN.",
        "entities": "Application, Redis Cache, PostgreSQL, CDN",
        "relationships": "App checks cache first (alt hit/miss); miss triggers DB query and cache warm-up; images fetched from CDN independently",
    },
    {
        "id": "seq_005",
        "diagram_type": "sequence",
        "mermaid_code": """\
sequenceDiagram
    participant U as User
    participant App as MobileApp
    participant OAuth as OAuthProvider
    participant API as BackendAPI
    participant DB as UserDB

    U->>App: Tap \"Login with Google\"
    App->>OAuth: redirect to /authorize
    OAuth->>U: show consent screen
    U->>OAuth: grant permission
    OAuth-->>App: authorization code
    App->>OAuth: POST /token {code, clientSecret}
    OAuth-->>App: access_token, id_token
    App->>API: GET /profile {Bearer token}
    API->>OAuth: GET /userinfo
    OAuth-->>API: {sub, email, name}
    API->>DB: upsert user record
    DB-->>API: userId
    API-->>App: {userId, profile}
    App-->>U: Home screen
""",
        "description": "OAuth2 authorization code flow. User initiates Google login; app receives auth code, exchanges it for tokens, then backend validates token with OAuth provider and upserts user in the database.",
        "entities": "User, MobileApp, OAuthProvider, BackendAPI, UserDB",
        "relationships": "PKCE-style code flow: App ↔ OAuth for tokens; API validates token via userinfo endpoint; DB upsert for first-time sign-in",
    },

    # ── FLOWCHARTS ──────────────────────────────────────────────────────────
    {
        "id": "flow_001",
        "diagram_type": "flowchart",
        "mermaid_code": """\
flowchart TD
    A([Start]) --> B[Receive order]
    B --> C{Stock available?}
    C -- Yes --> D[Reserve items]
    D --> E[Process payment]
    E --> F{Payment OK?}
    F -- Yes --> G[Ship order]
    G --> H[Send tracking email]
    H --> I([End])
    F -- No --> J[Release reservation]
    J --> K[Notify customer]
    K --> I
    C -- No --> L[Add to waitlist]
    L --> M[Notify when available]
    M --> I
""",
        "description": "Order fulfillment flowchart. Three paths: normal fulfillment (stock + payment OK → ship → notify), payment failure (release reservation + notify), and out-of-stock (waitlist + notify).",
        "entities": "Start, Receive order, Stock check, Reserve items, Payment processing, Ship order, Tracking email, Release reservation, Waitlist, End",
        "relationships": "Decision nodes: stock availability and payment success split into 2-3 branches each; all paths converge at End",
    },
    {
        "id": "flow_002",
        "diagram_type": "flowchart",
        "mermaid_code": """\
flowchart LR
    A([User request]) --> B[Load Balancer]
    B --> C[API Gateway]
    C --> D{Auth valid?}
    D -- No --> E[Return 401]
    D -- Yes --> F{Rate limit OK?}
    F -- No --> G[Return 429]
    F -- Yes --> H[Route to service]
    H --> I[UserService]
    H --> J[OrderService]
    H --> K[ProductService]
    I --> L[Cache Layer]
    J --> L
    K --> L
    L --> M[(Database)]
""",
        "description": "Microservices request routing flowchart (left-to-right). Requests pass through load balancer and API gateway. Auth and rate-limit gates precede routing to UserService, OrderService, or ProductService, all sharing a cache layer over the database.",
        "entities": "User request, Load Balancer, API Gateway, UserService, OrderService, ProductService, Cache Layer, Database",
        "relationships": "Sequential gates: auth check → rate limit → service routing; services share cache; cache persists to DB",
    },
    {
        "id": "flow_003",
        "diagram_type": "flowchart",
        "mermaid_code": """\
flowchart TD
    A([Start]) --> B[Upload document]
    B --> C[Extract text OCR]
    C --> D{Text quality OK?}
    D -- No --> E[Manual review queue]
    E --> F[Human corrects text]
    F --> G[Validated text]
    D -- Yes --> G
    G --> H[Classify document type]
    H --> I{Confidential?}
    I -- Yes --> J[Encrypt & restrict access]
    I -- No --> K[Index for search]
    J --> L[Secure storage]
    K --> M[Public storage]
    L --> N([End])
    M --> N
""",
        "description": "Document processing pipeline flowchart. OCR extracts text; low-quality text goes through manual review. Validated text is classified; confidential documents are encrypted to secure storage, others are indexed and stored publicly.",
        "entities": "Upload, OCR, Manual Review, Text Validation, Classifier, Encryption, Indexer, Secure Storage, Public Storage",
        "relationships": "Quality gate splits OCR output; manual path rejoins main; confidentiality gate splits to secure vs public storage",
    },
    {
        "id": "flow_004",
        "diagram_type": "flowchart",
        "mermaid_code": """\
flowchart TD
    A([Bug reported]) --> B[Triage]
    B --> C{Severity?}
    C -- Critical --> D[Assign to senior dev]
    C -- High --> E[Sprint backlog]
    C -- Low --> F[Icebox]
    D --> G[Fix within 4 hours]
    E --> H[Fix in next sprint]
    G --> I[Code review]
    H --> I
    I --> J{Review passed?}
    J -- No --> K[Request changes]
    K --> G
    J -- Yes --> L[Merge to main]
    L --> M[Deploy to staging]
    M --> N{Tests pass?}
    N -- No --> O[Rollback]
    O --> G
    N -- Yes --> P[Deploy to production]
    P --> Q[Close ticket]
    Q --> R([End])
    F --> R
""",
        "description": "Bug triage and resolution flowchart. Severity determines urgency (critical/high/low). Fixes go through code review and staging tests before production deploy. Failed review or tests loop back to the fix step.",
        "entities": "Bug report, Triage, Senior Dev, Sprint Backlog, Icebox, Code Review, Staging, Production",
        "relationships": "Severity decision (3 branches); code review feedback loop; staging test gate with rollback path; all paths end at ticket closure",
    },
    {
        "id": "flow_005",
        "diagram_type": "flowchart",
        "mermaid_code": """\
flowchart LR
    A([Input data]) --> B[Validate schema]
    B --> C{Valid?}
    C -- No --> D[Log error]
    D --> E[Send to DLQ]
    C -- Yes --> F[Transform data]
    F --> G[Enrich with metadata]
    G --> H{Batch full or timeout?}
    H -- No --> B
    H -- Yes --> I[Write to data warehouse]
    I --> J[Update checkpoint]
    J --> K([Done])
    E --> K
""",
        "description": "ETL data pipeline flowchart. Data is validated and transformed; invalid records go to Dead Letter Queue. Valid records are enriched and accumulated until batch size or timeout triggers a write to the data warehouse with checkpoint update.",
        "entities": "Input data, Schema Validator, Error Logger, DLQ, Transformer, Enricher, Batch Controller, Data Warehouse, Checkpoint",
        "relationships": "Validation gate (DLQ branch); batch accumulation loop; write-and-checkpoint final step",
    },

    # ── STATE DIAGRAMS ──────────────────────────────────────────────────────
    {
        "id": "state_001",
        "diagram_type": "stateDiagram",
        "mermaid_code": """\
stateDiagram-v2
    [*] --> Draft
    Draft --> UnderReview : submit
    UnderReview --> Approved : approve
    UnderReview --> Rejected : reject
    UnderReview --> Draft : requestChanges
    Approved --> Published : publish
    Published --> Archived : archive
    Rejected --> Draft : revise
    Archived --> [*]
""",
        "description": "Content lifecycle state machine. Content starts as Draft, is submitted for review. Reviewer can approve, reject, or request changes. Approved content can be published; published content eventually archived.",
        "entities": "Draft, UnderReview, Approved, Rejected, Published, Archived",
        "relationships": "submit, approve, reject, requestChanges, publish, archive, revise transitions; requestChanges and revise loop back to Draft",
    },
    {
        "id": "state_002",
        "diagram_type": "stateDiagram",
        "mermaid_code": """\
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : startJob
    Processing --> Paused : pause
    Paused --> Processing : resume
    Processing --> Completed : finish
    Processing --> Failed : error
    Failed --> Processing : retry
    Completed --> [*]
    Failed --> [*] : maxRetriesExceeded
""",
        "description": "Background job state machine. Job starts Idle, begins Processing, can be Paused/Resumed. Finishes as Completed or transitions to Failed. Failed jobs can be retried; after max retries the job terminates.",
        "entities": "Idle, Processing, Paused, Completed, Failed",
        "relationships": "startJob, pause/resume cycle, finish, error, retry transitions; maxRetriesExceeded terminates from Failed",
    },
    {
        "id": "state_003",
        "diagram_type": "stateDiagram",
        "mermaid_code": """\
stateDiagram-v2
    [*] --> Available
    Available --> Reserved : reserve
    Reserved --> Available : cancelReservation
    Reserved --> CheckedOut : checkOut
    CheckedOut --> Available : returnItem
    CheckedOut --> Damaged : reportDamage
    Damaged --> Maintenance : sendForRepair
    Maintenance --> Available : repaired
    Maintenance --> Disposed : irreparable
    Disposed --> [*]
""",
        "description": "Library item state machine. Items are Available, Reserved, CheckedOut, Damaged, in Maintenance, or Disposed. Damage triggers repair cycle; irreparable items are disposed.",
        "entities": "Available, Reserved, CheckedOut, Damaged, Maintenance, Disposed",
        "relationships": "reserve/cancel cycle; checkOut/return cycle; damage → repair → available or disposed path",
    },

    # ── ER DIAGRAMS ─────────────────────────────────────────────────────────
    {
        "id": "er_001",
        "diagram_type": "erDiagram",
        "mermaid_code": """\
erDiagram
    CUSTOMER {
        string customer_id PK
        string name
        string email
        string phone
    }
    ORDER {
        string order_id PK
        date created_at
        string status
        float total
        string customer_id FK
    }
    ORDER_ITEM {
        string item_id PK
        int quantity
        float unit_price
        string order_id FK
        string product_id FK
    }
    PRODUCT {
        string product_id PK
        string name
        float price
        int stock
        string category_id FK
    }
    CATEGORY {
        string category_id PK
        string name
        string description
    }
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER_ITEM }o--|| PRODUCT : references
    PRODUCT }o--|| CATEGORY : belongsTo
""",
        "description": "E-commerce ER diagram. Customer places zero or more Orders. Each Order contains one or more OrderItems. Each OrderItem references a Product. Products belong to a Category.",
        "entities": "CUSTOMER, ORDER, ORDER_ITEM, PRODUCT, CATEGORY",
        "relationships": "Customer 1-to-many Orders; Order 1-to-many OrderItems; OrderItem many-to-1 Product; Product many-to-1 Category",
    },
    {
        "id": "er_002",
        "diagram_type": "erDiagram",
        "mermaid_code": """\
erDiagram
    STUDENT {
        string student_id PK
        string name
        date birth_date
        string email
    }
    COURSE {
        string course_id PK
        string title
        int credits
        string department_id FK
    }
    ENROLLMENT {
        string enrollment_id PK
        date enrolled_at
        string grade
        string student_id FK
        string course_id FK
    }
    DEPARTMENT {
        string dept_id PK
        string name
        string head_faculty_id FK
    }
    FACULTY {
        string faculty_id PK
        string name
        string email
    }
    STUDENT ||--o{ ENROLLMENT : enrollsIn
    COURSE ||--o{ ENROLLMENT : hasStudents
    DEPARTMENT ||--o{ COURSE : offers
    FACULTY ||--o| DEPARTMENT : heads
""",
        "description": "University enrollment ER diagram. Students enroll in Courses via Enrollment junction table (with grade). Courses are offered by Departments; each Department is headed by one Faculty member.",
        "entities": "STUDENT, COURSE, ENROLLMENT, DEPARTMENT, FACULTY",
        "relationships": "Student ↔ Course many-to-many via Enrollment; Department offers Courses; Faculty heads Department (optional)",
    },
    {
        "id": "er_003",
        "diagram_type": "erDiagram",
        "mermaid_code": """\
erDiagram
    USER {
        string user_id PK
        string username
        string email
        string password_hash
        timestamp created_at
    }
    POST {
        string post_id PK
        string content
        timestamp published_at
        string user_id FK
    }
    COMMENT {
        string comment_id PK
        string content
        timestamp created_at
        string post_id FK
        string user_id FK
    }
    TAG {
        string tag_id PK
        string name
    }
    POST_TAG {
        string post_id FK
        string tag_id FK
    }
    USER ||--o{ POST : authors
    POST ||--o{ COMMENT : receives
    USER ||--o{ COMMENT : writes
    POST ||--o{ POST_TAG : taggedWith
    TAG ||--o{ POST_TAG : appliedTo
""",
        "description": "Blog platform ER diagram. Users author Posts and write Comments on posts. Posts are tagged with multiple Tags via POST_TAG junction. Comments link back to both Post and User.",
        "entities": "USER, POST, COMMENT, TAG, POST_TAG",
        "relationships": "User 1-to-many Posts; Post 1-to-many Comments; User 1-to-many Comments; Post ↔ Tag many-to-many via POST_TAG",
    },

    # ── COMPONENT / C4 DIAGRAMS ─────────────────────────────────────────────
    {
        "id": "comp_001",
        "diagram_type": "flowchart",
        "mermaid_code": """\
flowchart TB
    subgraph Client["Client Layer"]
        WebApp[Web App\nReact]
        MobileApp[Mobile App\nReact Native]
    end
    subgraph Gateway["API Gateway"]
        APIGW[API Gateway\nNginx + Auth]
    end
    subgraph Services["Microservices"]
        UserSvc[User Service\nNode.js]
        OrderSvc[Order Service\nPython]
        NotifSvc[Notification Service\nGo]
    end
    subgraph Data["Data Layer"]
        UserDB[(User DB\nPostgres)]
        OrderDB[(Order DB\nMongo)]
        Cache[(Cache\nRedis)]
        MQ[[Message Queue\nKafka]]
    end
    WebApp --> APIGW
    MobileApp --> APIGW
    APIGW --> UserSvc
    APIGW --> OrderSvc
    UserSvc --> UserDB
    UserSvc --> Cache
    OrderSvc --> OrderDB
    OrderSvc --> MQ
    MQ --> NotifSvc
""",
        "description": "Microservices architecture component diagram. React web and mobile apps connect through an Nginx API Gateway. Three backend services: User (Node.js/Postgres/Redis), Order (Python/MongoDB/Kafka), Notification (Go, consumes Kafka).",
        "entities": "WebApp, MobileApp, API Gateway, UserService, OrderService, NotificationService, UserDB, OrderDB, Redis, Kafka",
        "relationships": "Clients → Gateway → Services; UserSvc reads/writes Postgres and Redis; OrderSvc uses MongoDB and publishes to Kafka; NotifSvc consumes Kafka",
    },
    {
        "id": "comp_002",
        "diagram_type": "flowchart",
        "mermaid_code": """\
flowchart LR
    subgraph Internet
        User([End User])
    end
    subgraph AWS["AWS Cloud"]
        subgraph VPC
            ALB[Application\nLoad Balancer]
            subgraph ECS["ECS Cluster"]
                API[API Container]
                Worker[Worker Container]
            end
            subgraph RDS["RDS Subnet"]
                Primary[(Primary DB)]
                Replica[(Read Replica)]
            end
        end
        S3[(S3 Bucket)]
        CF[CloudFront CDN]
        SQS[[SQS Queue]]
    end
    User --> CF
    CF --> S3
    User --> ALB
    ALB --> API
    API --> Primary
    API --> Replica
    API --> SQS
    SQS --> Worker
    Worker --> Primary
    Worker --> S3
""",
        "description": "AWS cloud architecture component diagram. Users access static assets via CloudFront/S3 and dynamic API via ALB. API containers in ECS use RDS primary for writes and read replica for reads. SQS decouples async workers that process and store to S3.",
        "entities": "End User, CloudFront, S3, ALB, API Container, Worker Container, RDS Primary, Read Replica, SQS",
        "relationships": "CF serves static content; ALB routes to API; API read/write split on RDS; SQS decouples API from Worker; Worker writes to DB and S3",
    },

    # ── GANTT ───────────────────────────────────────────────────────────────
    {
        "id": "gantt_001",
        "diagram_type": "gantt",
        "mermaid_code": """\
gantt
    title Software Release v2.0
    dateFormat  YYYY-MM-DD
    section Planning
    Requirements gathering  :done,    req,  2024-01-01, 2024-01-14
    Architecture design     :done,    arch, 2024-01-10, 2024-01-21
    section Development
    Backend API             :active,  api,  2024-01-22, 30d
    Frontend UI             :         ui,   2024-01-29, 25d
    Database migration      :         db,   2024-01-22, 10d
    section Testing
    Integration tests       :         test, after api, 14d
    UAT                     :         uat,  after test, 7d
    section Deployment
    Staging deploy          :         stg,  after uat, 3d
    Production release      :         prod, after stg, 1d
""",
        "description": "Software release v2.0 Gantt chart. Planning phase: requirements and architecture design. Development: backend API, frontend UI, DB migration (parallel). Testing: integration tests then UAT. Deployment: staging then production.",
        "entities": "Requirements, Architecture, Backend API, Frontend UI, DB Migration, Integration Tests, UAT, Staging Deploy, Production Release",
        "relationships": "Architecture overlaps requirements; development tasks parallel; testing sequential after API; staging after UAT; production after staging",
    },

    # ── MINDMAP ─────────────────────────────────────────────────────────────
    {
        "id": "mind_001",
        "diagram_type": "mindmap",
        "mermaid_code": """\
mindmap
  root((Software\nArchitecture))
    Frontend
      React
      Angular
      Vue
    Backend
      REST API
      GraphQL
      gRPC
    Database
      Relational
        PostgreSQL
        MySQL
      NoSQL
        MongoDB
        Redis
    Infrastructure
      Cloud
        AWS
        GCP
        Azure
      Containers
        Docker
        Kubernetes
    Security
      Authentication
        JWT
        OAuth2
      Authorization
        RBAC
        ABAC
""",
        "description": "Software architecture mindmap centered on the root concept. Five main branches: Frontend (React/Angular/Vue), Backend (REST/GraphQL/gRPC), Database (Relational/NoSQL), Infrastructure (Cloud/Containers), and Security (Auth/AuthZ).",
        "entities": "Software Architecture (root), Frontend, Backend, Database, Infrastructure, Security and their sub-nodes",
        "relationships": "Hierarchical tree from root; each branch expands into technologies and sub-categories",
    },

    # ── ADDITIONAL CLASS ────────────────────────────────────────────────────
    {
        "id": "class_006",
        "diagram_type": "class",
        "mermaid_code": """\
classDiagram
    class Shape {
        <<interface>>
        +area() float
        +perimeter() float
        +draw() void
    }
    class Circle {
        +float radius
        +area() float
        +perimeter() float
        +draw() void
    }
    class Rectangle {
        +float width
        +float height
        +area() float
        +perimeter() float
        +draw() void
    }
    class Triangle {
        +float base
        +float height
        +float hypotenuse
        +area() float
        +perimeter() float
        +draw() void
    }
    class Canvas {
        +List~Shape~ shapes
        +addShape(s: Shape) void
        +removeShape(s: Shape) void
        +render() void
        +totalArea() float
    }
    Shape <|.. Circle
    Shape <|.. Rectangle
    Shape <|.. Triangle
    Canvas o-- Shape
""",
        "description": "Geometric shapes class diagram using interface pattern. Shape interface defines area(), perimeter(), draw(). Circle, Rectangle, Triangle implement it. Canvas aggregates many Shapes and orchestrates rendering.",
        "entities": "Shape (interface), Circle, Rectangle, Triangle, Canvas",
        "relationships": "Circle, Rectangle, Triangle implement Shape; Canvas aggregates 0..* Shapes",
    },
    {
        "id": "class_007",
        "diagram_type": "class",
        "mermaid_code": """\
classDiagram
    class Notification {
        <<abstract>>
        +String recipientId
        +String message
        +Date sentAt
        +send() bool
    }
    class EmailNotification {
        +String toAddress
        +String subject
        +String htmlBody
        +send() bool
    }
    class SMSNotification {
        +String phoneNumber
        +send() bool
    }
    class PushNotification {
        +String deviceToken
        +String title
        +send() bool
    }
    class NotificationService {
        +notify(type: String, payload: Map) void
        +scheduleNotification(n: Notification, when: Date) void
    }
    class NotificationLog {
        +String logId
        +String notificationId
        +bool success
        +String errorMessage
    }
    Notification <|-- EmailNotification
    Notification <|-- SMSNotification
    Notification <|-- PushNotification
    NotificationService --> Notification : creates
    Notification --> NotificationLog : generates
""",
        "description": "Notification system class diagram. Abstract Notification defines the send() contract. Three concrete types: Email, SMS, Push. NotificationService creates and schedules notifications. Each send generates a NotificationLog entry.",
        "entities": "Notification (abstract), EmailNotification, SMSNotification, PushNotification, NotificationService, NotificationLog",
        "relationships": "Concrete types inherit Notification; Service creates Notifications; Notification generates Log on send",
    },
    {
        "id": "class_008",
        "diagram_type": "class",
        "mermaid_code": """\
classDiagram
    class Repository~T~ {
        <<interface>>
        +findById(id: String) T
        +findAll() List~T~
        +save(entity: T) T
        +delete(id: String) void
    }
    class UserRepository {
        +findByEmail(email: String) User
        +findByRole(role: String) List~User~
    }
    class ProductRepository {
        +findByCategory(cat: String) List~Product~
        +findInPriceRange(min: float, max: float) List~Product~
    }
    class UserService {
        -UserRepository repo
        +getUser(id: String) User
        +updateProfile(id: String, data: Map) User
    }
    class ProductService {
        -ProductRepository repo
        +searchProducts(query: String) List~Product~
        +updateStock(id: String, qty: int) void
    }
    Repository <|.. UserRepository
    Repository <|.. ProductRepository
    UserService --> UserRepository : uses
    ProductService --> ProductRepository : uses
""",
        "description": "Repository pattern class diagram with generics. Generic Repository interface defines CRUD. UserRepository and ProductRepository implement it with domain-specific queries. Services depend on repositories (dependency injection).",
        "entities": "Repository<T> (interface), UserRepository, ProductRepository, UserService, ProductService",
        "relationships": "Repositories implement generic Repository; Services depend on corresponding Repository via constructor injection",
    },

    # ── ADDITIONAL SEQUENCE ─────────────────────────────────────────────────
    {
        "id": "seq_006",
        "diagram_type": "sequence",
        "mermaid_code": """\
sequenceDiagram
    participant P as Producer
    participant K as Kafka Broker
    participant C1 as Consumer 1
    participant C2 as Consumer 2
    participant DB as Database

    P->>K: publish(topic=orders, event=OrderPlaced)
    K-->>P: ack offset=1042
    K->>C1: deliver(OrderPlaced)
    K->>C2: deliver(OrderPlaced)
    C1->>DB: INSERT INTO inventory_reservations
    DB-->>C1: ok
    C1->>K: commit offset
    C2->>DB: INSERT INTO audit_log
    DB-->>C2: ok
    C2->>K: commit offset
""",
        "description": "Kafka pub/sub sequence diagram. Producer publishes OrderPlaced event; Kafka acknowledges with offset. Two consumers receive the same event: Consumer 1 creates inventory reservation, Consumer 2 writes audit log. Both commit offsets independently.",
        "entities": "Producer, Kafka Broker, Consumer 1, Consumer 2, Database",
        "relationships": "Fan-out delivery to two consumer groups; independent offset management; both consumers write to DB",
    },
    {
        "id": "seq_007",
        "diagram_type": "sequence",
        "mermaid_code": """\
sequenceDiagram
    participant Client
    participant LB as Load Balancer
    participant N1 as Node 1
    participant N2 as Node 2
    participant ZK as ZooKeeper

    Client->>LB: request
    LB->>ZK: getLeader()
    ZK-->>LB: Node 1 is leader
    LB->>N1: forward request
    N1->>N2: replicate(data)
    N2-->>N1: ack
    N1-->>LB: response
    LB-->>Client: response

    Note over N1,ZK: Node 1 crashes
    ZK->>ZK: leader election
    ZK->>N2: promote to leader
""",
        "description": "Distributed system leader election sequence. Load balancer queries ZooKeeper for current leader (Node 1). Request is processed and replicated to Node 2. After Node 1 crashes, ZooKeeper conducts election and promotes Node 2.",
        "entities": "Client, Load Balancer, Node 1, Node 2, ZooKeeper",
        "relationships": "LB discovers leader via ZK; leader replicates to follower; ZK detects crash and triggers election",
    },

    # ── ADDITIONAL ER ───────────────────────────────────────────────────────
    {
        "id": "er_004",
        "diagram_type": "erDiagram",
        "mermaid_code": """\
erDiagram
    PROJECT {
        string project_id PK
        string name
        date start_date
        date end_date
        string status
    }
    EMPLOYEE {
        string emp_id PK
        string name
        string role
        string department
    }
    TASK {
        string task_id PK
        string title
        string description
        string status
        date due_date
        string project_id FK
        string assignee_id FK
    }
    SPRINT {
        string sprint_id PK
        int sprint_number
        date start_date
        date end_date
        string project_id FK
    }
    SPRINT_TASK {
        string sprint_id FK
        string task_id FK
    }
    PROJECT ||--o{ TASK : contains
    PROJECT ||--o{ SPRINT : organizes
    EMPLOYEE ||--o{ TASK : assignedTo
    SPRINT ||--o{ SPRINT_TASK : includes
    TASK ||--o{ SPRINT_TASK : inSprints
""",
        "description": "Agile project management ER diagram. Projects contain Tasks and Sprints. Employees are assigned Tasks. Tasks are associated with Sprints via SPRINT_TASK junction (a task can span sprints).",
        "entities": "PROJECT, EMPLOYEE, TASK, SPRINT, SPRINT_TASK",
        "relationships": "Project 1-to-many Tasks; Project 1-to-many Sprints; Employee 1-to-many Tasks; Task ↔ Sprint many-to-many via SPRINT_TASK",
    },

    # ── ADDITIONAL STATE ────────────────────────────────────────────────────
    {
        "id": "state_004",
        "diagram_type": "stateDiagram",
        "mermaid_code": """\
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting : connect()
    Connecting --> Connected : onOpen
    Connecting --> Disconnected : onError
    Connected --> Authenticating : sendAuth
    Authenticating --> Authenticated : onAuthSuccess
    Authenticating --> Disconnected : onAuthFail
    Authenticated --> Subscribing : subscribe(channel)
    Subscribing --> Active : onSubscribed
    Active --> Active : onMessage
    Active --> Reconnecting : onDisconnect
    Reconnecting --> Connecting : backoffDelay
    Active --> Disconnected : close()
""",
        "description": "WebSocket connection lifecycle state machine. Starts disconnected, connects with backoff, authenticates, subscribes to channel, enters Active state receiving messages. Disconnect triggers reconnection loop; explicit close ends the cycle.",
        "entities": "Disconnected, Connecting, Connected, Authenticating, Authenticated, Subscribing, Active, Reconnecting",
        "relationships": "connect/error/open transitions; auth success/fail gates; subscribe gate; reconnect loop via backoff; close terminates",
    },
    {
        "id": "state_005",
        "diagram_type": "stateDiagram",
        "mermaid_code": """\
stateDiagram-v2
    [*] --> Pending
    Pending --> Running : scheduler picks up
    Running --> Completed : success
    Running --> Failed : exception
    Running --> Cancelled : user cancels
    Failed --> Retrying : retryPolicy allows
    Retrying --> Running : backoff elapsed
    Retrying --> DeadLetter : maxAttempts exceeded
    Completed --> [*]
    Cancelled --> [*]
    DeadLetter --> [*]
""",
        "description": "Async task queue state machine. Tasks queue as Pending, run when scheduler picks them up. Success → Completed; Exception → Failed → Retrying (with backoff) → Dead Letter on max attempts; User cancel terminates immediately.",
        "entities": "Pending, Running, Completed, Failed, Retrying, DeadLetter, Cancelled",
        "relationships": "scheduler trigger; success/exception/cancel from Running; retry policy gate; backoff loop; dead letter terminus",
    },
]


def write_csv(diagrams):
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for d in diagrams:
            writer.writerow({k: d.get(k, "") for k in CSV_FIELDS})
    print(f"CSV written: {CSV_PATH} ({len(diagrams)} records)")


def generate_images(diagrams):
    ok, fail = 0, 0
    for d in diagrams:
        img_path = IMAGES_DIR / f"{d['id']}.png"
        d["image_path"] = str(img_path)
        print(f"  Generating {d['id']}...", end=" ")
        if mermaid_to_image(d["mermaid_code"], img_path):
            print("OK")
            ok += 1
        else:
            print("FAILED")
            fail += 1
        time.sleep(0.3)  # gentle rate-limiting
    print(f"\nImages: {ok} ok, {fail} failed")


if __name__ == "__main__":
    print(f"Generating {len(DIAGRAMS)} diagrams...\n")
    generate_images(DIAGRAMS)
    write_csv(DIAGRAMS)
    print("\nDone. Files:")
    print(f"  CSV    -> {CSV_PATH}")
    print(f"  Images -> {IMAGES_DIR}/")
