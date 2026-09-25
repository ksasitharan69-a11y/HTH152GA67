# data.py - Preloaded Synthetic Data for 24-Hour MVP

JOB_DESCRIPTIONS = {
    "JD 1: Senior Backend Engineer (Java / Cloud)": """Role: Senior Backend Engineer
Requirements:
1. Production microservices development in Java and Spring Boot.
2. Relational database performance profiling, indexing, and tuning (PostgreSQL/MySQL).
3. Containerization and orchestration experience using Docker and Kubernetes.
4. Experience implementing distributed event streaming (Apache Kafka or RabbitMQ).""",

    "JD 2: Full Stack AI Engineer (Python / React)": """Role: Full Stack AI Engineer
Requirements:
1. Production-grade application development using React / TypeScript.
2. Backend API development using Python (FastAPI / Flask).
3. LLM application development, prompt engineering, and RAG pipeline integration.
4. Cloud deployment and monitoring using AWS (Lambda, ECS, or S3).""",

    "JD 3: Data Engineer (Distributed Systems & ETL)": """Role: Data Engineer
Requirements:
1. Distributed data processing and pipeline design using Apache Spark or PySpark.
2. Advanced data warehouse modeling (Snowflake, BigQuery, or Redshift).
3. Production ETL scheduling and DAG orchestration using Apache Airflow.
4. Strong proficiency in SQL optimization and relational data hygiene."""
}

RESUMES = {
    "Candidate 1 (Strong Java Backend)": """Alex Mercer
Email: alex.mercer@devmail.io | Phone: +1-555-019-2834 | Graduated: 2018
Summary:
Backend specialist with 6 years building high-throughput payment architectures.
Experience:
- Architected and delivered 8 Java Spring Boot microservices handling 12,000 requests/sec.
- Identified slow queries in PostgreSQL, added composite indexes, and optimized query execution plans reducing latency by 45%.
- Containerized enterprise services with Docker and configured Helm charts for Kubernetes deployments on AWS EKS.
- Built event-driven transaction notification systems using Apache Kafka clusters.""",

    "Candidate 2 (Java Engineer - Missing Kafka & Profiling)": """Jordan Lee
Email: j.lee@cloudworks.com | Phone: +1-555-482-1920 | Graduated: 2021
Summary:
Software developer focused on web APIs and transactional databases.
Experience:
- Developed REST endpoints using Java and Spring Boot framework for enterprise inventory.
- Created schemas, tables, and standard queries for PostgreSQL database.
- Used Docker compose files locally to run development databases and test instances.
- Exposed to AWS EC2 deployment workflows.""",

    "Candidate 3 (Full Stack Python / React)": """Samantha Roy
Email: sroy@frontendlabs.org | Phone: +1-555-992-3341 | Graduated: 2019
Summary:
Full-stack software developer with expertise in interactive web apps and AI tools.
Experience:
- Built modern single-page applications using React, Next.js, and TypeScript with reusable component libraries.
- Designed scalable asynchronous REST APIs with Python FastAPI and PostgreSQL backend.
- Implemented RAG search pipelines utilizing OpenAI and vector databases (Pinecone).
- Deployed serverless microservices via AWS Lambda, API Gateway, and automated S3 static hosting.""",

    "Candidate 4 (React Only - Lacks Python Backend & Cloud)": """David Kim
Email: dkim@webdesign.co | Phone: +1-555-728-1123 | Graduated: 2022
Summary:
Frontend engineer passionate about UI/UX and client-side logic.
Experience:
- Developed responsive client web apps using React, Tailwind CSS, and TypeScript.
- Integrated third-party REST APIs and visualized analytical charts using D3.js.
- Basic familiarity with Python scripting for automated file conversion.
- Hosted static sites on Vercel and Netlify.""",

    "Candidate 5 (Data Engineer - Spark & BigQuery)": """Elena Rostova
Email: erostova@datalake.io | Phone: +1-555-381-9922 | Graduated: 2017
Summary:
Senior Data Engineer with extensive big data infrastructure background.
Experience:
- Constructed batch and real-time processing pipelines using Apache Spark and PySpark.
- Modeled corporate dimensional data warehouses on Google BigQuery, optimizing partition tables.
- Wrote and monitored complex DAG workflows using Apache Airflow.
- Authored advanced analytical SQL scripts for cross-functional reporting.""",

    "Candidate 6 (SQL Analyst - Lacks Spark & Airflow)": """Michael Chang
Email: mchang@analyticsnet.com | Phone: +1-555-229-8472 | Graduated: 2020
Summary:
Business Intelligence Developer with focus on relational data and dashboards.
Experience:
- Built SQL queries, stored procedures, and views in Snowflake for metric calculations.
- Designed Tableau and PowerBI dashboards for executive decision makers.
- Automated weekly data exports using Python cron scripts.
- Documented data dictionaries and warehouse table schemas.""",

    "Candidate 7 (Keyword Stuffer - Superficial Java)": """Priya Sharma
Email: priya.s@techpulse.org | Phone: +1-555-492-3812 | Graduated: 2023
Summary:
Skilled engineer familiar with Java, Spring Boot, PostgreSQL, Docker, Kubernetes, and Kafka.
Experience:
- Worked on software development team delivering customer features.
- Attended daily standups and created documentation for code repositories.
- Exposure to modern technology stacks including container tools and relational databases.""",

    "Candidate 8 (Python ML Engineer - Missing React Frontend)": """Lucas Vance
Email: lvance@aiengine.ai | Phone: +1-555-771-4491 | Graduated: 2021
Summary:
Machine learning developer working on NLP models and retrieval systems.
Experience:
- Built inference pipelines using Python FastAPI and LangChain for internal document indexing.
- Deployed vector search applications to AWS ECS with auto-scaling groups.
- Evaluated open-source LLMs using synthetic benchmarks.
- Basic understanding of web frontends.""",

    "Candidate 9 (DevOps Engineer applying to Backend Role)": """Marcus Brody
Email: mbrody@infraops.net | Phone: +1-555-112-9904 | Graduated: 2016
Summary:
Site Reliability and Cloud Infrastructure engineer.
Experience:
- Deployed and maintained Kubernetes clusters using Helm, ArgoCD, and Docker images.
- Set up monitoring and alerting using Prometheus and Grafana for backend services.
- Managed Kafka broker configurations and topic partitions across production environments.
- Basic scripting in Python and Go for infrastructure automation.""",

    "Candidate 10 (Junior Developer - Broad Potential)": """Chloe Bennett
Email: cbennett@universityalumni.edu | Phone: +1-555-883-2190 | Graduated: 2024
Summary:
Recent computer science graduate with solid internship experience.
Experience:
- Completed backend development internship building REST APIs with Java and Spring.
- Integrated PostgreSQL database for user authentication flows.
- Participated in containerizing university capstone project with Docker.
- Strong fundamentals in data structures, algorithms, and modular design."""
}