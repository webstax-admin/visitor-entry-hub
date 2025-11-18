import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getRequests, saveRequest, addHistoryEntry, getCurrentUser } from '@/lib/storage';
import { Search, Scan, LogIn, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Security = () => {
  const [scanValue, setScanValue] = useState('');
  const [scannedGuest, setScannedGuest] = useState<any>(null);
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const requests = getRequests();

  // Get all approved requests with guests
  const approvedGuests = useMemo(() => {
    const guests: any[] = [];
    requests
      .filter(req => req.status === 'approved')
      .forEach(req => {
        req.guests.forEach((guest, index) => {
          guests.push({
            ...guest,
            ticketNumber: req.ticketNumber,
            guestIndex: index,
            requester: req.empDetails.empname,
            location: req.locationToVisit,
            arrivalDate: req.tentativeArrival,
          });
        });
      });
    return guests;
  }, [requests]);

  const handleScan = () => {
    if (!scanValue.trim()) {
      toast({
        title: 'Invalid Scan',
        description: 'Please enter or scan a QR code',
        variant: 'destructive',
      });
      return;
    }

    // Find the guest by QR code
    const foundGuest = approvedGuests.find(g => g.qrCode === scanValue);

    if (!foundGuest) {
      toast({
        title: 'Guest Not Found',
        description: 'No approved visitor found with this QR code',
        variant: 'destructive',
      });
      setScannedGuest(null);
      return;
    }

    setScannedGuest(foundGuest);
  };

  const handleCheckIn = () => {
    if (!scannedGuest || !currentUser) return;

    const request = getRequests().find(r => r.ticketNumber === scannedGuest.ticketNumber);
    if (!request) return;

    const now = new Date().toISOString();
    const updatedGuests = request.guests.map((g, idx) => {
      if (idx === scannedGuest.guestIndex) {
        return {
          ...g,
          checkedIn: true,
          checkInTime: now,
        };
      }
      return g;
    });

    const updatedRequest = {
      ...request,
      guests: updatedGuests,
    };

    saveRequest(updatedRequest);

    addHistoryEntry({
      ticketNumber: request.ticketNumber,
      userId: currentUser.empid,
      comment: `Guest ${scannedGuest.name} checked in`,
      actionType: 'CHECK_IN',
      beforeState: 'not_checked_in',
      afterState: 'checked_in',
      timestamp: now,
    });

    toast({
      title: 'Check-In Successful',
      description: `${scannedGuest.name} has been checked in`,
    });

    setScanValue('');
    setScannedGuest(null);
  };

  const handleCheckOut = () => {
    if (!scannedGuest || !currentUser) return;

    // Check if 15 minutes have passed since check-in
    const checkInTime = new Date(scannedGuest.checkInTime).getTime();
    const now = new Date().getTime();
    const minutesPassed = (now - checkInTime) / (1000 * 60);

    if (minutesPassed < 15) {
      toast({
        title: 'Too Early',
        description: 'Minimum 15 minutes required between check-in and check-out',
        variant: 'destructive',
      });
      return;
    }

    const request = getRequests().find(r => r.ticketNumber === scannedGuest.ticketNumber);
    if (!request) return;

    const checkOutTime = new Date().toISOString();
    const updatedGuests = request.guests.map((g, idx) => {
      if (idx === scannedGuest.guestIndex) {
        return {
          ...g,
          checkOutTime,
        };
      }
      return g;
    });

    const updatedRequest = {
      ...request,
      guests: updatedGuests,
    };

    saveRequest(updatedRequest);

    addHistoryEntry({
      ticketNumber: request.ticketNumber,
      userId: currentUser.empid,
      comment: `Guest ${scannedGuest.name} checked out`,
      actionType: 'CHECK_OUT',
      beforeState: 'checked_in',
      afterState: 'checked_out',
      timestamp: checkOutTime,
    });

    toast({
      title: 'Check-Out Successful',
      description: `${scannedGuest.name} has been checked out`,
    });

    setScanValue('');
    setScannedGuest(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <Card className="border-none shadow-soft bg-gradient-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Scan className="h-6 w-6" />
              Security Check-In/Out
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Scan visitor QR codes to manage entry and exit
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Scanner Section */}
        <Card>
          <CardHeader>
            <CardTitle>QR Code Scanner</CardTitle>
            <CardDescription>Scan or enter the visitor's QR code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Scan or enter QR code (e.g., WAVE-20250118-001-GUEST-0)"
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleScan} className="gap-2">
                <Scan className="h-4 w-4" />
                Scan
              </Button>
            </div>

            {scannedGuest && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-semibold">{scannedGuest.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Company:</span>
                        <p className="font-semibold">{scannedGuest.company}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ticket:</span>
                        <p className="font-mono text-xs">{scannedGuest.ticketNumber}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Location:</span>
                        <p className="font-semibold">{scannedGuest.location}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Requested By:</span>
                        <p className="font-semibold">{scannedGuest.requester}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <p>
                          {scannedGuest.checkedIn ? (
                            scannedGuest.checkOutTime ? (
                              <Badge className="bg-muted text-muted-foreground">Checked Out</Badge>
                            ) : (
                              <Badge className="bg-success text-success-foreground">Checked In</Badge>
                            )
                          ) : (
                            <Badge className="bg-warning text-warning-foreground">Not Checked In</Badge>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {!scannedGuest.checkedIn && (
                        <Button onClick={handleCheckIn} className="gap-2">
                          <LogIn className="h-4 w-4" />
                          Check In
                        </Button>
                      )}
                      {scannedGuest.checkedIn && !scannedGuest.checkOutTime && (
                        <Button onClick={handleCheckOut} variant="outline" className="gap-2">
                          <LogOut className="h-4 w-4" />
                          Check Out
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setScannedGuest(null);
                          setScanValue('');
                        }}
                        variant="ghost"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Guest List */}
        <Card>
          <CardHeader>
            <CardTitle>Approved Visitors</CardTitle>
            <CardDescription>{approvedGuests.length} visitors across all approved requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Arrival Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-In Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedGuests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No approved visitors yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvedGuests.map((guest, idx) => (
                      <TableRow key={`${guest.ticketNumber}-${idx}`}>
                        <TableCell className="font-medium">{guest.name}</TableCell>
                        <TableCell>{guest.company}</TableCell>
                        <TableCell className="font-mono text-xs">{guest.ticketNumber}</TableCell>
                        <TableCell>{guest.location}</TableCell>
                        <TableCell>
                          {new Date(guest.arrivalDate).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          {guest.checkedIn ? (
                            guest.checkOutTime ? (
                              <Badge className="bg-muted text-muted-foreground">Checked Out</Badge>
                            ) : (
                              <Badge className="bg-success text-success-foreground">Checked In</Badge>
                            )
                          ) : (
                            <Badge className="bg-warning text-warning-foreground">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {guest.checkInTime
                            ? new Date(guest.checkInTime).toLocaleString('en-IN')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Security;
