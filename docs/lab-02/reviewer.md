<!-- filepath: c:\Users\User\Downloads\toktickit\docs\lab-02\reviewer.md -->

# Lab 02 โ€” Peer Review Evidence

## Reviewer Information

- **Name:** [Full name]
- **Student ID:** [Student ID]
- **Role:** Peer Reviewer
- **Repository:** [Repository link]

## Pull Request Links

1. **Branch 1 โ€” Backend and Tests:** [PR link for Branch 1]
2. **Branch 2 โ€” UI Adjustments:** [PR link for Branch 2]

## Feedback and Discussions

### Branch 1: Backend and Tests

- Review API error handling and ensure appropriate HTTP status codes are returned.
- Verify requester authorization and ticket ownership checks.
- Add tests for ticket number collisions and concurrent requests.
- Test Thai filenames and filenames containing spaces.

### Branch 2: UI Adjustments

- Display Ticket Number and Ticket Date as read-only fields.
- Add page-size options: `5, 8, 10, 20`.
- Reset to page 1 when the page size changes.
- Ensure the new selector does not break existing pagination tests.

## Resolution

- Improved error handling for attachment metadata and ticket creation.
- Added retry logic for ticket number collisions.
- Added integration tests for inactive reference data and inactive requesters.
- Preserved Thai characters and spaces in `originalFileName`.
- Added read-only Ticket Number and Ticket Date fields to the Create Ticket page.
- Added a page-size selector to the Ticket List page and reset pagination to page 1 when changed.
- Ran the relevant tests and fixed the issues until they passed.

## Approval Evidence

### Branch 1

- **Review status:** Approved
- **Approved by:** [Approver's name]
- **Date:** [Date]
- **Evidence:**  
  ![Branch 1 approval](./evidence/branch-1-approval.png)

### Branch 2

- **Review status:** Approved
- **Approved by:** [Approver's name]
- **Date:** [Date]
- **Evidence:**  
  ![Branch 2 approval](./evidence/branch-2-approval.png)
