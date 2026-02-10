# Alumni Profile Fields for Student Side Frontend

This document outlines all the required form fields and UI components needed to create an Alumni Profile feature on the student side, allowing graduated students to add and manage their alumni information.

## Overview

The Alumni Profile feature will allow graduated students to:
- Create their alumni profile after graduation
- Add career information (jobs, higher studies, business, other activities)
- Manage skills and proficiency levels
- Add career highlights and achievements
- Update personal and contact information
- Set support status and preferences

## Form Fields Required

### 1. Basic Alumni Information Form

**Alumni Type Selection**
- Field Type: Radio buttons or Select dropdown
- Options: 
  - "Recent Graduate" (recent)
  - "Established Professional" (established)
- Required: Yes
- Default: "Recent Graduate"

**Graduation Year**
- Field Type: Number input or Year picker
- Required: Yes
- Validation: Must be current year or past year
- Placeholder: "2024"

**Support Category**
- Field Type: Radio buttons or Select dropdown
- Options:
  - "Receiving Support" (receiving_support)
  - "Need Extra Support" (needs_extra_support)
  - "No Support Needed" (no_support_needed)
- Required: Yes
- Default: "No Support Needed"

**Personal Bio**
- Field Type: Textarea
- Required: No
- Max Length: 1000 characters
- Placeholder: "Tell us about yourself, your goals, and achievements..."
- Character counter: Show remaining characters

### 2. Contact & Profile Information Form

**Email Address**
- Field Type: Email input
- Required: Yes
- Pre-filled from student profile
- Validation: Valid email format
- Placeholder: "your.email@example.com"

**Mobile Number**
- Field Type: Text input with phone formatting
- Required: Yes
- Pre-filled from student profile
- Validation: Valid phone number format
- Placeholder: "01XXXXXXXXX"

**Current Address**
- Field Type: Textarea or structured address fields
- Required: Yes
- Pre-filled from student profile
- Placeholder: "House/Flat, Road, Area, District"

**Profile Photo**
- Field Type: File upload with image preview
- Required: No
- Accepted formats: JPG, PNG, GIF
- Max size: 5MB
- Preview: Show current photo if exists

**LinkedIn Profile URL**
- Field Type: URL input
- Required: No
- Validation: Valid URL format
- Placeholder: "https://linkedin.com/in/yourprofile"

**Portfolio Website URL**
- Field Type: URL input
- Required: No
- Validation: Valid URL format
- Placeholder: "https://yourportfolio.com"

### 3. Career Information Form

**Position Type Selection**
- Field Type: Card-based selection or Radio buttons
- Options:
  - **Job Holder** - Employment position at a company
  - **Higher Studies** - Pursuing further education
  - **Business** - Running own business or startup
  - **Other** - Freelancing, consulting, or other activities
- Required: Yes
- UI: Show icons and descriptions for each option

#### For Job Position Type:
**Job Title**
- Field Type: Text input
- Required: Yes
- Placeholder: "Software Engineer, Marketing Manager, etc."

**Company Name**
- Field Type: Text input
- Required: Yes
- Placeholder: "Company or Organization Name"

**Salary Range** (Optional)
- Field Type: Select dropdown or Text input
- Options: "Below 20k", "20k-40k", "40k-60k", "60k-80k", "80k-100k", "Above 100k", "Prefer not to say"
- Required: No

#### For Higher Studies Type:
**Degree Name**
- Field Type: Text input
- Required: Yes
- Placeholder: "Master's, PhD, Diploma, etc."

**Field of Study**
- Field Type: Text input
- Required: Yes
- Placeholder: "Computer Science, Business Administration, etc."

**Institution Name**
- Field Type: Text input
- Required: Yes
- Placeholder: "University or Institution Name"

#### For Business Type:
**Business Name**
- Field Type: Text input
- Required: Yes
- Placeholder: "Your Business Name"

**Business Type**
- Field Type: Text input or Select dropdown
- Required: Yes
- Options: "Technology", "Retail", "Services", "Manufacturing", "Consulting", "Other"
- Placeholder: "Type of business or industry"

#### For Other Type:
**Activity Type**
- Field Type: Text input
- Required: Yes
- Placeholder: "Freelancing, Consulting, Volunteering, etc."

#### Common Fields for All Career Types:
**Start Date**
- Field Type: Date picker
- Required: Yes
- Validation: Cannot be future date

**End Date**
- Field Type: Date picker
- Required: Only if not current position
- Validation: Must be after start date

**Currently Working Here**
- Field Type: Checkbox
- Required: No
- Effect: Disables end date field when checked

**Location**
- Field Type: Text input
- Required: No
- Placeholder: "City, Country or Remote"

**Job Description**
- Field Type: Textarea
- Required: No
- Max Length: 500 characters
- Placeholder: "Describe your role, responsibilities, and key achievements..."

### 4. Skills Management Form

**Add Skill Section**
- UI: Repeatable form section with "Add Another Skill" button

**Skill Name**
- Field Type: Text input with autocomplete
- Required: Yes
- Placeholder: "JavaScript, Leadership, English, etc."

**Skill Category**
- Field Type: Select dropdown
- Options:
  - "Technical" (programming, tools, software)
  - "Soft Skills" (communication, leadership, teamwork)
  - "Languages" (English, Bangla, Hindi, etc.)
  - "Other" (any other skills)
- Required: Yes

**Proficiency Level**
- Field Type: Slider or Select dropdown
- Range: 1-100 or Beginner/Intermediate/Advanced/Expert
- Required: Yes
- UI: Visual slider with labels (Beginner 1-25, Intermediate 26-50, Advanced 51-75, Expert 76-100)

### 5. Career Highlights Form

**Add Highlight Section**
- UI: Repeatable form section with "Add Another Highlight" button

**Highlight Title**
- Field Type: Text input
- Required: Yes
- Max Length: 200 characters
- Placeholder: "Award name, achievement title, project name, etc."

**Highlight Type**
- Field Type: Select dropdown
- Options:
  - "Achievement" (personal or professional accomplishment)
  - "Milestone" (career milestone or goal reached)
  - "Award" (recognition or award received)
  - "Project" (significant project completed)
- Required: Yes

**Description**
- Field Type: Textarea
- Required: Yes
- Max Length: 500 characters
- Placeholder: "Describe the highlight, its impact, and significance..."

**Date**
- Field Type: Date picker
- Required: Yes
- Validation: Cannot be future date

## Form UI/UX Design Guidelines

### Multi-Step Wizard Layout:
1. **Step 1**: Basic Alumni Information (Alumni type, graduation year, support category, bio)
2. **Step 2**: Contact & Profile Update (email, phone, address, photo, social links)
3. **Step 3**: Current Position (career information based on selected type)
4. **Step 4**: Skills (add multiple skills with categories and proficiency)
5. **Step 5**: Career Highlights (add achievements, awards, milestones)
6. **Step 6**: Review & Submit (preview all information before submission)

### Form Components:
- **Progress Indicator**: Show current step and overall progress
- **Navigation**: Previous/Next buttons, ability to jump to specific steps
- **Auto-save**: Save form data locally to prevent data loss
- **Validation**: Real-time validation with clear error messages
- **Character Counters**: For text areas with length limits
- **File Upload**: Drag-and-drop interface for profile photo
- **Dynamic Fields**: Show/hide fields based on selections

### Visual Design:
- **Card-based Layout**: Group related fields in cards
- **Icons**: Use relevant icons for different sections and field types
- **Color Coding**: Different colors for different career types
- **Responsive Design**: Mobile-friendly layout with proper spacing
- **Loading States**: Show loading indicators during form submission

### Accessibility:
- **Labels**: Proper labels for all form fields
- **ARIA Attributes**: Screen reader support
- **Keyboard Navigation**: Tab order and keyboard shortcuts
- **Error Handling**: Clear error messages and focus management
- **Color Contrast**: Ensure sufficient contrast for all text

### Mobile Considerations:
- **Touch-friendly**: Large touch targets for mobile devices
- **Simplified Layout**: Stack fields vertically on small screens
- **Native Inputs**: Use appropriate input types for mobile keyboards
- **Swipe Navigation**: Allow swiping between form steps
- **Sticky Navigation**: Keep navigation buttons accessible

## Form Validation Messages

### Required Field Messages:
- "Please select your alumni type"
- "Graduation year is required"
- "Please select your support category"
- "Email address is required"
- "Mobile number is required"
- "Please select a position type"
- "Job title is required"
- "Company name is required"
- "Skill name is required"
- "Please select a skill category"

### Format Validation Messages:
- "Please enter a valid email address"
- "Please enter a valid phone number"
- "Please enter a valid URL"
- "Start date cannot be in the future"
- "End date must be after start date"
- "Please enter a valid year"

### Length Validation Messages:
- "Bio cannot exceed 1000 characters"
- "Skill name cannot exceed 100 characters"
- "Highlight title cannot exceed 200 characters"
- "Description cannot exceed 500 characters"

## Success and Confirmation Messages

### Form Submission:
- "Alumni profile created successfully!"
- "Your information has been saved and is under review"
- "You will receive a confirmation email shortly"

### Auto-save:
- "Changes saved automatically"
- "Draft saved"

### File Upload:
- "Profile photo uploaded successfully"
- "File size too large. Please choose a file under 5MB"
- "Invalid file format. Please upload JPG, PNG, or GIF"

This comprehensive form structure will provide graduated students with an intuitive and user-friendly interface to create their alumni profiles while capturing all necessary information for the admin-side Alumni Details page.