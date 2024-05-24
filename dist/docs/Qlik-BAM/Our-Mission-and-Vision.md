# Our Mission and Vision for Qlik

## Introduction

### Purpose

This document lays out the mission and vision of the business intelligence tool Qlik, as implemented within the School District of Philadelphia. This includes all components and capabilities for the Qlik services.

This document is primarily intended for Qlik developers and Qlik administrators in the District. After reading this document, the audience should understand the general principles of the product development cycle in Qlik and associated procedures for using, maintaining, and administering the components and capabilities of the business intelligence tool Qlik.

## Overview

Qlik is a business intelligence tool that allows for data gathering, processing, storage, analysis, and visualization. According to [Solomon Negash and Paul Gray](https://link.springer.com/chapter/10.1007/978-3-540-48716-6_9),

Business intelligence emphasizes analysis of large volumes of data about the firm and its operations. … In computer-based environments, business intelligence uses a large database, typically stored in a data warehouse or data mart, as its source of information and as the basis for sophisticated analysis. Analyses ranges from simple reporting to slice-and-dice, drill down, answering ad hoc queries, real-time analysis, and forecasting.

### Mission

Qlik is a tool to create and deliver interactive data products. The District [uses Qlik](https://www.philasd.org/performance/qlikbam-dashboards/) to provide information to stakeholders, including the public, and to support decision-makers in their efforts to achieve the District's mission. Qlik serves to support the [core values of the District](https://www.philasd.org/about/), such as transparency & accountability.

### Guiding Principles

#### General

Developers and administrators should:

* create, maintain, use, and enforce conventions
* develop processes that are repeatable, scalable, and automated
* ensure processes are not duplicative and do not rely on particular individualspeople
* Prioritize standardization and consistency
* minimize unnecessary complexity
* encourage creative solutions
* foster self-service
* avoid unnecessary data exposure

#### Development

Developers should:

* create, maintain, use, and enforce a "house style" for front and back end
* develop and use modular, reliable, and readable code
* avoid duplicative code
* create, maintain, use, and enforce structured data in a structured data pipeline
* resolve data quality issues early in the structured data pipeline
* ensure products have highly comprehensible data and visualizations, contain relevant data for stakeholders, and are appropriate for the target audience

#### Administration

Administrators should:

* create, maintain, use, and enforce a "house style" for infrastructure components
* provide system infrastructure guidance to scale both development and end user activity
* avoid unnecessary access to data and products [security settings]
* manage access permissions using a rules-based framework [user groups and access]

## Context

### People

There are four overlapping groups of people: users, developers, administrators, and project managers. They are not formal roles in the District tied to specific job titles.

#### Users

Users have read access to visualization apps and use them to analyze data. In many cases, users are decision-makers who access Qlik to inform their decisions. Users request apps and features from developers. Users range from data analysts to school principals to parents/guardians to the highest levels of district leadership.

##### District Leaders

District leaders are a subset of users who hold high-level decision-making authority within the organization. District leaders often request apps and features from developers and approve new apps and features.

##### Subject Matter Experts

Subject matter experts are a subset of users who have particular expertise and interest in specific topic areas. They include program office staff, external partners, and researchers. They often serve as partners in the development cycle.

#### Developers

Developers have edit access to apps and create/update apps in a structured development cycle. Developers receive and implement requests from users to develop apps and features. Developers implement business rules, clean and process data, and create data visualizations. Developers range from data analysts to researchers to program office leaders and are concentrated in ERA.

#### Administrators

Administrators have edit access to management systems and configuration settings. Administrators are responsible for oversight of the environments. Administrators maintain the Qlik system for developers and users in a support role, as well as work with vendors and District IT. All administrators are senior members of SDP.

#### Project Managers

Project managers facilitate the development cycle. They manage the workflow for developers and administrators in a support role.

### System

The Qlik system consists of one host, three services, and three environments, which requires multiple servers/nodes and multiple file shares.

#### Host

* AWS Cloud

#### Services

* QlikSense
* Qlik Analytics Platform
* Qlik NPrinting

#### Environments

- Development (Dev)
    - [QlikSense](https://devqlik.philasd.org/hub/)
    - [QAP](https://devdashboards.philasd.org)
    - [NPrinting](https://devnprinting.philasd.org:4993)
- Testing (Test)
    - [QlikSense](https://testqlik.philasd.org/hub/)
    - [QAP](https://testdashboards.philasd.org)
    - [NPrinting](https://testnprinting.philasd.org:4993)
- Production (Prod)
    - [QlikSense](https://qlik.philasd.org/hub/)
    - [QAP](https://dashboards.philasd.org/hub)
    - [NPrinting](https://nprinting.philasd.org:4993)

#### File Shares

* Shared Persistence
* Data Share

### Training

The District maintains a library of training modules for developers, administrators and for users. The library contains documents (e.g., manuals, instructions) and videos.

## Vision

### Product Development Workflow

The development of products in Qlik is a collaboration between project managers, district leaders, subject matter experts, and developers. The product development cycle involves code and data review and must use the Qlik development, testing, and production environments.

The typical workflow begins with district leaders or subject matter experts defining the goals and requirements of a new product, new feature, or update. Developers then translate the requirements into business rules, consume and process the data, create data models, and produce visualizations consistent with the goals, requirements, and business rules. Each step is iterative and likely requires coordination within the project team.

The most common types of development work in Qlik are:

* script for data processing
* front-end visualizations
* extensions
* administration code that supports Qlik processes (including R, Python, and Stata code)
* policy and procedure documentation

### Infrastructure

The Qlik infrastructure setup is a service driven by both development and end user needs.

It is hosted in a scalable environment and provides administrators managed access to system resources. Qlik relies on multiple engines/nodes to handle user needs that are dynamically scaling to minimize user disruption. Realtime performance monitoring is set up. Metadata are extracted from Qlik systems, and analyzed on a regular basis in order to assess system performance.

### Data Storage

Data storage platforms are made accessible to developers by administrators as needed for development. Administrators ensure that data is stored in alignment with district policies for access and security. Administrators support data lineage efforts. Database usage is prioritized when available.

For each project, administrators determine the appropriate data storage platform in coordination with developers, as informed by the requirements of current and anticipated future development.

### Version History

Version history for Qlik development prioritizes version control in order to maintain accountability and continuity across development cycles. Version control is managed collaboratively by administrators, who manage the version control platforms, and developers, who utilize these platforms.

All development work is tracked in a version control system. Work is tracked in the most specific and detailed way available.

Development work should be:

* clearly attributed to the developer(s) who completed the work
* marked with timestamps for the creation and edits
* available to other developers for collaboration, review, and edits via repositories
* revertible in a clean and non-disruptive way

### Qlik Management

The management of Qlik includes creating/updating/deleting assets within the Qlik environments. Administrators use the Qlik Management Console (QMC) specific to each Qlik environment. Administrators monitor Qlik assets and ensure that rules and conventions are consistently implemented using automation when possible.

### Qlik Maintenance

The maintenance of the Qlik system includes maintenance windows, software upgrades, and environment alignments. Maintenance should be conducted regularly on scheduled cycles with minimal impact to users.

### Project Management

All tasks associated with Qlik development should be organized in a project management tool.

### Vendor Management

If a project related to Qlik requires a vendor to complete Qlik development tasks, ERA leadership should manage the relationship with the vendor.

