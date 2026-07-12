import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def create_workflow_pdf(filename="TransitOps_Workflow_Matrix.pdf"):
    # Set up document margins
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    # Base palette styles
    PRIMARY_COLOR = colors.HexColor("#0f172a") # Dark Slate
    ACCENT_COLOR = colors.HexColor("#2563eb")  # Electric Blue
    TEXT_COLOR = colors.HexColor("#334155")    # Charcoal
    LIGHT_BG = colors.HexColor("#f8fafc")      # Light Slate Accent
    BORDER_COLOR = colors.HexColor("#e2e8f0")  # Cool Grey
    
    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY_COLOR,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=20
    )
    
    h1_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=PRIMARY_COLOR,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'SubSectionHeader',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=ACCENT_COLOR,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=TEXT_COLOR,
        spaceAfter=8
    )
    
    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12,
        textColor=colors.white
    )
    
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=TEXT_COLOR
    )
    
    table_cell_bold_style = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=PRIMARY_COLOR
    )
    
    story = []
    
    # ─── HEADER ───
    story.append(Paragraph("TransitOps Platform", title_style))
    story.append(Paragraph("Operational Workflows, Role Matrix & Architecture Guide", subtitle_style))
    story.append(Spacer(1, 10))
    
    # ─── SECTION 1: INTRODUCTION ───
    story.append(Paragraph("1. Executive Summary", h1_style))
    intro_p = (
        "TransitOps is a smart, full-stack transport operations platform designed to coordinate fleet management, "
        "trip logistics, driver dispatch, asset maintenance, and operational logs. "
        "By enforcing strict verification rules and embedding Gemini AI context views, the system provides "
        "real-time synchronization between dispatchers, drivers, maintenance crews, and administrators."
    )
    story.append(Paragraph(intro_p, body_style))
    story.append(Spacer(1, 10))
    
    # ─── SECTION 2: ROLE ARCHITECTURE ───
    story.append(Paragraph("2. User Access & Role Matrix", h1_style))
    role_p = (
        "The platform operates on a Role-Based Access Control (RBAC) hierarchy. Menu structures, page actions, "
        "and API endpoints are dynamically filtered based on these credentials:"
    )
    story.append(Paragraph(role_p, body_style))
    
    # Roles Table Data
    role_data = [
      [
        Paragraph("Role Type", table_header_style),
        Paragraph("UI View Focus", table_header_style),
        Paragraph("Permissions & Scope", table_header_style)
      ],
      [
        Paragraph("Administrator<br/>(ADMIN)", table_cell_bold_style),
        Paragraph("Control Center Theme (Violet)<br/>Full nav view + Admin Panel links", table_cell_style),
        Paragraph("• Platform-wide database access<br/>• User management & driver profile verification<br/>• Analytics exports & cost auditing", table_cell_style)
      ],
      [
        Paragraph("Dispatcher<br/>(DISPATCHER)", table_cell_bold_style),
        Paragraph("Dispatch Console Theme (Blue)<br/>Trips, Drivers, and Vehicles registries", table_cell_style),
        Paragraph("• Trip registry creation & dispatch assignment<br/>• Payload limit validations<br/>• Driver eligibility & license expiry overrides", table_cell_style)
      ],
      [
        Paragraph("Maintenance Manager<br/>(MAINTENANCE)", table_cell_bold_style),
        Paragraph("Fleet Workshop Theme (Amber)<br/>Maintenance requests, servicing records", table_cell_style),
        Paragraph("• Repairs logging & completion hooks<br/>• Vehicle condition state changes<br/>• OOS (Out-of-service) triggers", table_cell_style)
      ],
      [
        Paragraph("Fleet Driver<br/>(DRIVER)", table_cell_bold_style),
        Paragraph("Driver Portal Theme (Emerald)<br/>Personal dispatch logs, fuel & expense logs", table_cell_style),
        Paragraph("• Route GPS & status updates<br/>• Fuel receipts & strictly increasing odometer logs<br/>• Trip expense logs submission", table_cell_style)
      ]
    ]
    
    role_table = Table(role_data, colWidths=[1.3*inch, 2.3*inch, 3.4*inch])
    role_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ACCENT_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(role_table)
    story.append(PageBreak())
    
    # ─── SECTION 3: OPERATIONAL WORKFLOWS ───
    story.append(Paragraph("3. Core Operational Workflows", h1_style))
    
    # 3.1 Trip Lifecycle
    story.append(Paragraph("3.1 Trip Dispatch Lifecycle", h2_style))
    story.append(Paragraph("The primary workflow path for logistics operations follows a state-machine progression:", body_style))
    story.append(Paragraph("1. <b>Scheduling:</b> The Dispatcher matches a vehicle and driver for a specific route. Behind the scenes, validations confirm the driver's license is active (not expired) and that the cargo weight does not exceed the vehicle's max payload capacity.", bullet_style))
    story.append(Paragraph("2. <b>Activation:</b> Upon starting the trip, the state shifts to <i>In Progress</i>. This locks the vehicle status to <i>On Trip</i> and the driver to <i>On Trip</i>.", bullet_style))
    story.append(Paragraph("3. <b>Resolution:</b> The driver updates route logs. When complete, the dispatcher updates the state to <i>Completed</i> (which prompts for actual trip mileage update) or <i>Cancelled</i>. The vehicles and drivers are automatically returned to the <i>Available</i> roster.", bullet_style))
    story.append(Spacer(1, 8))
    
    # 3.2 Maintenance Loop
    story.append(Paragraph("3.2 Asset Maintenance & Safety Lifecycle", h2_style))
    story.append(Paragraph("Ensures all vehicles are operating safely through automatic condition locking:", body_style))
    story.append(Paragraph("1. <b>Service Request:</b> Maintenance managers trigger a repair log for a specific vehicle.", bullet_style))
    story.append(Paragraph("2. <b>Locking:</b> The vehicle status is automatically updated to <i>Maintenance</i> (or <i>Out of Service</i> if critical) to block dispatchers from scheduling it for any new trips.", bullet_style))
    story.append(Paragraph("3. <b>Release:</b> Once maintenance works are completed and logged, the vehicle status reverts back to <i>Available</i> automatically.", bullet_style))
    story.append(Spacer(1, 8))
    
    # 3.3 Financial & Odometer Sync
    story.append(Paragraph("3.3 Financial Logging & Verification Loop", h2_style))
    story.append(Paragraph("Keeps fuel and general expenses synchronized with strict math checks:", body_style))
    story.append(Paragraph("• <b>Fuel Log Odometer Check:</b> Odometer inputs must exceed the vehicle's last recorded odometer reading. Successful logging automatically updates the vehicle's odometer value.", bullet_style))
    story.append(Paragraph("• <b>Cost Aggregation:</b> Expense logs (tolls, lodging, etc.) are matched with dispatch IDs, rolling up into the monthly financial audit views.", bullet_style))
    story.append(Spacer(1, 8))
    
    # 3.4 Live Tracking & External Navigation
    story.append(Paragraph("3.4 Live Location Tracking & External Navigation", h2_style))
    story.append(Paragraph("Integrates real-world routing and GPS tracking interfaces dynamically:", body_style))
    story.append(Paragraph("• <b>Light-Mode Vector Mapping:</b> Utilizes Leaflet.js and CartoDB Voyager light tiles to draw road paths by geocoding origin/destination parameters using Nominatim and calculating OSRM coordinates.", bullet_style))
    story.append(Paragraph("• <b>Speed & Progress Simulation:</b> Active dispatches show real-time animated indicator progress, variable speed control, and continuous ETA estimations.", bullet_style))
    story.append(Paragraph("• <b>Google Maps External Link:</b> Provides deep-linked 'Navigate (Google Maps)' controls to load origin/destination address variables directly in external routing tabs.", bullet_style))
    story.append(Spacer(1, 8))
    
    # 3.5 Dedicated Live Tracking Dashboard
    story.append(Paragraph("3.5 Dedicated Live Tracking Dashboard", h2_style))
    story.append(Paragraph("Provides a dedicated space in the main navigation for fleet-wide real-time tracking:", body_style))
    story.append(Paragraph("• <b>Roster Panel:</b> Lists all active dispatches currently in-progress with vehicle and driver assignments.", bullet_style))
    story.append(Paragraph("• <b>Map Center:</b> Clicking on any active dispatch dynamically focus the light-mode map on its route path with live telemetry simulation.", bullet_style))
    story.append(Spacer(1, 10))
    
    # ─── SECTION 4: AI ASSISTANT ───
    story.append(Paragraph("4. AI Copilot Integration", h1_style))
    ai_p = (
        "The platform embeds a Gemini 2.5 Flash assistant. When a user requests operations analysis, "
        "the system dynamically constructs a real-time fleet snapshot (counts of active trips, available drivers, "
        "maintenance tasks, and vehicles) and injects it as a system prompt instruction. This guarantees that "
        "answers regarding fleet utilization and scheduling are grounded in the actual database state."
    )
    story.append(Paragraph(ai_p, body_style))
    
    # Footer Callback to add Page numbers
    def add_page_number(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(colors.HexColor("#64748b"))
        
        # Draw header border
        canvas.setStrokeColor(BORDER_COLOR)
        canvas.setLineWidth(0.5)
        canvas.line(54, doc.height + 54, doc.width + 54, doc.height + 54)
        
        # Header text
        canvas.drawString(54, doc.height + 60, "TransitOps Platform Operational Reference")
        
        # Footer text
        page_num = canvas.getPageNumber()
        canvas.drawRightString(doc.width + 54, 36, f"Page {page_num}")
        canvas.drawString(54, 36, "Confidential · For Internal Operations Only")
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print("PDF Generation complete.")

if __name__ == "__main__":
    create_workflow_pdf("TransitOps_Workflow_Matrix.pdf")
