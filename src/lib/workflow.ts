import { VisitRequest, Approval, Employee, getEmployeeById } from './storage';

// Determine required approvers based on workflow rules
export const determineApprovers = (request: VisitRequest, empDetails: Employee): Approval[] => {
  const approvals: Approval[] = [];
  
  // Rule 1: Manager approval always required
  if (empDetails.managerid) {
    const manager = getEmployeeById(empDetails.managerid);
    if (manager) {
      approvals.push({
        approverId: manager.empid,
        approverEmail: manager.empemail,
        status: 'pending',
      });
    }
  }
  
  // Rule 2: Plant visit requires additional approval from Chandra Kumar
  // But only if cell line visit is NOT Yes (because then we need Saluja's approval instead)
  if (request.typeOfLocation === 'Plant' && !request.cellLineVisit) {
    approvals.push({
      approverId: 'PEPPL0548',
      approverEmail: 'chandra.kumar@premierenergies.com',
      status: 'pending',
    });
  }
  
  // Rule 3: Cell line visit requires approval from Saluja (replaces Chandra Kumar)
  if (request.cellLineVisit) {
    approvals.push({
      approverId: '10000',
      approverEmail: 'saluja@premierenergies.com',
      status: 'pending',
    });
  }
  
  return approvals;
};

// Check if current user is an approver for the request
export const isApprover = (request: VisitRequest, userEmail: string): boolean => {
  return request.approvals.some(approval => 
    approval.approverEmail === userEmail && approval.status === 'pending'
  );
};

// Get current pending approver
export const getCurrentApprover = (request: VisitRequest): Approval | null => {
  const pendingApproval = request.approvals.find(approval => approval.status === 'pending');
  return pendingApproval || null;
};

// Check if all approvals are completed
export const isFullyApproved = (request: VisitRequest): boolean => {
  return request.approvals.length > 0 && 
         request.approvals.every(approval => approval.status === 'approved');
};

// Check if any approval is declined
export const isDeclined = (request: VisitRequest): boolean => {
  return request.approvals.some(approval => approval.status === 'declined');
};
