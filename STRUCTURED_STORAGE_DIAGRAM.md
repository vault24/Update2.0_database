# Structured Document Storage System - Visual Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Admin UI   │  │  Student UI  │  │  Teacher UI  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API Gateway   │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
┌─────────▼─────────┐ ┌─────▼──────┐ ┌────────▼────────┐
│ Structured Views  │ │ Serializers│ │  File Storage   │
│  - Upload         │ │ - Validate │ │  Service        │
│  - List           │ │ - Transform│ │  - Save         │
│  - Delete         │ │ - Serialize│ │  - Delete       │
└─────────┬─────────┘ └─────┬──────┘ └────────┬────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Document Model │
                    │   (Database)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  File System    │
                    │   (Storage)     │
                    └─────────────────┘
```

## Storage Hierarchy

```
Documents/
│
├── Student_Documents/
│   │
│   ├── computer-technology/
│   │   │
│   │   ├── 2024-2025/
│   │   │   │
│   │   │   ├── 1st-shift/
│   │   │   │   │
│   │   │   │   ├── MdMahadi_SIPI-889900/
│   │   │   │   │   ├── photo.jpg
│   │   │   │   │   ├── birth_certificate.pdf
│   │   │   │   │   ├── nid.pdf
│   │   │   │   │   ├── father_nid.pdf
│   │   │   │   │   ├── mother_nid.pdf
│   │   │   │   │   ├── ssc_marksheet.pdf
│   │   │   │   │   ├── ssc_certificate.pdf
│   │   │   │   │   ├── transcript.pdf
│   │   │   │   │   └── other_documents/
│   │   │   │   │       ├── medical_certificate.pdf
│   │   │   │   │       └── quota_document.pdf
│   │   │   │   │
│   │   │   │   └── AnotherStudent_SIPI-889901/
│   │   │   │       └── ...
│   │   │   │
│   │   │   └── 2nd-shift/
│   │   │       └── ...
│   │   │
│   │   └── 2023-2024/
│   │       └── ...
│   │
│   ├── civil-engineering/
│   │   └── ...
│   │
│   └── electrical-engineering/
│       └── ...
│
├── Teacher_Documents/
│   │
│   └── computer-technology/
│       │
│       ├── JohnDoe_T-12345/
│       │   ├── photo.jpg
│       │   ├── nid.pdf
│       │   ├── certificates/
│       │   │   ├── degree.pdf
│       │   │   └── training.pdf
│       │   └── other/
│       │       └── ...
│       │
│       └── JaneSmith_T-12346/
│           └── ...
│
├── Alumni_Documents/
│   │
│   └── computer-technology/
│       │
│       ├── 2023/
│       │   │
│       │   ├── AlumniName_A-12345/
│       │   │   ├── photo.jpg
│       │   │   └── certificates/
│       │   │       └── diploma.pdf
│       │   │
│       │   └── Anot