import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  getCurrentUser,
  saveRequest,
  generateTicketNumber,
  getRequestByTicketNumber,
  addHistoryEntry,
  generateQRCode,
  type Guest,
  type VisitRequest,
} from '@/lib/storage';
import { determineApprovers } from '@/lib/workflow';
import { Trash2, Plus } from 'lucide-react';

const RequestForm = () => {
  const [searchParams] = useSearchParams();
  const editTicketNumber = searchParams.get('edit');
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  // Form state
  const [visitorCategory, setVisitorCategory] = useState('Employee');
  const [visitorCategoryOther, setVisitorCategoryOther] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [guests, setGuests] = useState<Guest[]>([
    { name: '', number: '', email: '', company: '', designation: '' },
  ]);
  const [purposeOfVisit, setPurposeOfVisit] = useState('');
  const [tentativeArrival, setTentativeArrival] = useState('');
  const [tentativeDuration, setTentativeDuration] = useState('');
  const [lunchRequired, setLunchRequired] = useState(false);
  const [lunchCategory, setLunchCategory] = useState('');
  const [dietaryRequirements, setDietaryRequirements] = useState('');
  const [meetingWith, setMeetingWith] = useState('');
  const [typeOfLocation, setTypeOfLocation] = useState<'Office' | 'Plant'>('Office');
  const [locationToVisit, setLocationToVisit] = useState('');
  const [areaToVisit, setAreaToVisit] = useState('');
  const [cellLineVisit, setCellLineVisit] = useState(false);
  const [anythingElse, setAnythingElse] = useState('');

  useEffect(() => {
    if (editTicketNumber) {
      const existingRequest = getRequestByTicketNumber(editTicketNumber);
      if (existingRequest) {
        setVisitorCategory(existingRequest.visitorCategory);
        setVisitorCategoryOther(existingRequest.visitorCategoryOther || '');
        setNumberOfGuests(existingRequest.numberOfGuests);
        setGuests(existingRequest.guests);
        setPurposeOfVisit(existingRequest.purposeOfVisit);
        setTentativeArrival(existingRequest.tentativeArrival);
        setTentativeDuration(existingRequest.tentativeDuration);
        setLunchRequired(existingRequest.lunchRequired);
        setLunchCategory(existingRequest.lunchCategory || '');
        setDietaryRequirements(existingRequest.dietaryRequirements || '');
        setMeetingWith(existingRequest.meetingWith);
        setTypeOfLocation(existingRequest.typeOfLocation);
        setLocationToVisit(existingRequest.locationToVisit);
        setAreaToVisit(existingRequest.areaToVisit);
        setCellLineVisit(existingRequest.cellLineVisit);
        setAnythingElse(existingRequest.anythingElse || '');
      }
    }
  }, [editTicketNumber]);

  useEffect(() => {
    const diff = numberOfGuests - guests.length;
    if (diff > 0) {
      setGuests([...guests, ...Array(diff).fill({ name: '', number: '', email: '', company: '', designation: '' })]);
    } else if (diff < 0) {
      setGuests(guests.slice(0, numberOfGuests));
    }
  }, [numberOfGuests]);

  const updateGuest = (index: number, field: keyof Guest, value: string) => {
    const newGuests = [...guests];
    newGuests[index] = { ...newGuests[index], [field]: value };
    setGuests(newGuests);
  };

  const handleSubmit = () => {
    if (!currentUser) return;

    // Validation
    if (!purposeOfVisit || !tentativeArrival || !tentativeDuration || !meetingWith || !locationToVisit || !areaToVisit) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const incompleteGuest = guests.some(g => !g.name || !g.number || !g.email || !g.company || !g.designation);
    if (incompleteGuest) {
      toast({
        title: 'Incomplete Guest Information',
        description: 'Please complete all guest details',
        variant: 'destructive',
      });
      return;
    }

    const ticketNumber = editTicketNumber || generateTicketNumber();
    const isEdit = !!editTicketNumber;
    const existingRequest = isEdit ? getRequestByTicketNumber(ticketNumber) : null;

    // Generate QR codes for new guests
    const guestsWithQR = guests.map((guest, index) => ({
      ...guest,
      qrCode: guest.qrCode || generateQRCode(ticketNumber, index),
    }));

    const request: VisitRequest = {
      ticketNumber,
      empDetails: currentUser,
      visitorCategory,
      visitorCategoryOther: visitorCategory === 'Others' ? visitorCategoryOther : undefined,
      numberOfGuests,
      guests: guestsWithQR,
      purposeOfVisit,
      tentativeArrival,
      tentativeDuration,
      lunchRequired,
      lunchCategory: lunchRequired ? lunchCategory : undefined,
      dietaryRequirements: lunchRequired ? dietaryRequirements : undefined,
      meetingWith,
      typeOfLocation,
      locationToVisit,
      areaToVisit,
      cellLineVisit,
      anythingElse,
      creationDatetime: existingRequest?.creationDatetime || new Date().toISOString(),
      status: isEdit ? 'pending' : 'pending',
      approvals: determineApprovers(
        {
          typeOfLocation,
          cellLineVisit,
        } as VisitRequest,
        currentUser
      ),
      currentApproverIndex: 0,
    };

    saveRequest(request);

    addHistoryEntry({
      ticketNumber,
      userId: currentUser.empid,
      comment: isEdit ? 'Request edited and resubmitted' : 'Request created',
      actionType: isEdit ? 'EDIT' : 'CREATE',
      beforeState: isEdit ? 'approved/pending' : 'none',
      afterState: 'pending',
      timestamp: new Date().toISOString(),
    });

    toast({
      title: isEdit ? 'Request Updated' : 'Request Created',
      description: `Ticket ${ticketNumber} has been ${isEdit ? 'updated' : 'created'} successfully`,
    });

    navigate('/overview');
  };

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {editTicketNumber ? 'Edit Visit Request' : 'New Visit Request'}
            </CardTitle>
            <CardDescription>
              Fill in the details for your visitor request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Employee Details (Auto-captured) */}
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold">Employee Details (Auto-captured)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span> <span className="font-medium">{currentUser.empname}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ID:</span> <span className="font-medium">{currentUser.empid}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span> <span className="font-medium">{currentUser.empemail}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span> <span className="font-medium">{currentUser.dept}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span> <span className="font-medium">{currentUser.emplocation}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Designation:</span> <span className="font-medium">{currentUser.designation}</span>
                </div>
              </div>
            </div>

            {/* Visitor Category */}
            <div className="space-y-2">
              <Label htmlFor="visitorCategory">Visitor Category *</Label>
              <Select value={visitorCategory} onValueChange={setVisitorCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Employee', 'Customer', 'Investor', 'Inspection', 'Auditor', 'Lender', 'Vendor', 'Others'].map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {visitorCategory === 'Others' && (
                <Input
                  placeholder="Please specify"
                  value={visitorCategoryOther}
                  onChange={(e) => setVisitorCategoryOther(e.target.value)}
                />
              )}
            </div>

            {/* Number of Guests */}
            <div className="space-y-2">
              <Label htmlFor="numberOfGuests">Number of Guests *</Label>
              <Input
                id="numberOfGuests"
                type="number"
                min="1"
                max="20"
                value={numberOfGuests}
                onChange={(e) => setNumberOfGuests(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Guest Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Guest Details *</Label>
              </div>
              {guests.map((guest, index) => (
                <Card key={index} className="p-4">
                  <h4 className="font-medium mb-4">Guest {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={guest.name}
                        onChange={(e) => updateGuest(index, 'name', e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number *</Label>
                      <Input
                        value={guest.number}
                        onChange={(e) => updateGuest(index, 'number', e.target.value)}
                        placeholder="+91 XXXXXXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={guest.email}
                        onChange={(e) => updateGuest(index, 'email', e.target.value)}
                        placeholder="email@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <Input
                        value={guest.company}
                        onChange={(e) => updateGuest(index, 'company', e.target.value)}
                        placeholder="Company name"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Designation *</Label>
                      <Input
                        value={guest.designation}
                        onChange={(e) => updateGuest(index, 'designation', e.target.value)}
                        placeholder="Job title"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Purpose and Meeting Details */}
            <div className="space-y-2">
              <Label htmlFor="purposeOfVisit">Purpose of Visit *</Label>
              <Textarea
                id="purposeOfVisit"
                value={purposeOfVisit}
                onChange={(e) => setPurposeOfVisit(e.target.value)}
                placeholder="Describe the purpose of this visit"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tentativeArrival">Tentative Arrival *</Label>
                <Input
                  id="tentativeArrival"
                  type="datetime-local"
                  value={tentativeArrival}
                  onChange={(e) => setTentativeArrival(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tentativeDuration">Duration *</Label>
                <Input
                  id="tentativeDuration"
                  value={tentativeDuration}
                  onChange={(e) => setTentativeDuration(e.target.value)}
                  placeholder="e.g., 2 hours, Half day"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingWith">Meeting With *</Label>
              <Input
                id="meetingWith"
                value={meetingWith}
                onChange={(e) => setMeetingWith(e.target.value)}
                placeholder="Name of person(s) to meet"
              />
            </div>

            {/* Lunch Requirements */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="lunchRequired"
                  checked={lunchRequired}
                  onCheckedChange={setLunchRequired}
                />
                <Label htmlFor="lunchRequired">Lunch Required</Label>
              </div>

              {lunchRequired && (
                <>
                  <div className="space-y-2">
                    <Label>Lunch Category</Label>
                    <Select value={lunchCategory} onValueChange={setLunchCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Category A</SelectItem>
                        <SelectItem value="B">Category B</SelectItem>
                        <SelectItem value="C">Category C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dietary Requirements</Label>
                    <Input
                      value={dietaryRequirements}
                      onChange={(e) => setDietaryRequirements(e.target.value)}
                      placeholder="Any special dietary requirements"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Location Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type of Location *</Label>
                <Select value={typeOfLocation} onValueChange={(value: 'Office' | 'Plant') => setTypeOfLocation(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Office">Office</SelectItem>
                    <SelectItem value="Plant">Plant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location to Visit *</Label>
                <Select value={locationToVisit} onValueChange={setLocationToVisit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOfLocation === 'Office' ? (
                      <>
                        <SelectItem value="Corporate Office">Corporate Office</SelectItem>
                        <SelectItem value="City Office">City Office</SelectItem>
                        <SelectItem value="Pune">Pune</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="Fabcity">Fabcity</SelectItem>
                        <SelectItem value="Factory-Annaram">Factory-Annaram</SelectItem>
                        <SelectItem value="Sitarampur">Sitarampur</SelectItem>
                        <SelectItem value="Nayudupeta">Nayudupeta</SelectItem>
                        <SelectItem value="Gurgaon">Gurgaon</SelectItem>
                        <SelectItem value="Maheshwaram">Maheshwaram</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="areaToVisit">Area to Visit *</Label>
                <Input
                  id="areaToVisit"
                  value={areaToVisit}
                  onChange={(e) => setAreaToVisit(e.target.value)}
                  placeholder="Specific area or department"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="cellLineVisit"
                  checked={cellLineVisit}
                  onCheckedChange={setCellLineVisit}
                />
                <Label htmlFor="cellLineVisit">Do you plan on visiting any cell line?</Label>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-2">
              <Label htmlFor="anythingElse">Anything else we should know?</Label>
              <Textarea
                id="anythingElse"
                value={anythingElse}
                onChange={(e) => setAnythingElse(e.target.value)}
                placeholder="Any additional information"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSubmit} size="lg" className="flex-1">
                {editTicketNumber ? 'Update Request' : 'Submit Request'}
              </Button>
              <Button onClick={() => navigate('/overview')} variant="outline" size="lg">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default RequestForm;
