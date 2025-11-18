import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getRequests, getHistory } from '@/lib/storage';
import { BarChart3, TrendingUp, Users, Clock, Download, Filter } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Analytics = () => {
  const requests = getRequests();
  const history = getHistory();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (filterCategory !== 'all' && req.visitorCategory !== filterCategory) return false;
      if (filterLocation !== 'all' && req.locationToVisit !== filterLocation) return false;
      if (filterStatus !== 'all' && req.status !== filterStatus) return false;
      return true;
    });
  }, [requests, filterCategory, filterLocation, filterStatus]);

  const stats = useMemo(() => {
    const total = requests.length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const declined = requests.filter(r => r.status === 'declined').length;
    const totalGuests = requests.reduce((sum, r) => sum + r.numberOfGuests, 0);

    const categoryBreakdown = requests.reduce((acc, r) => {
      acc[r.visitorCategory] = (acc[r.visitorCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const locationBreakdown = requests.reduce((acc, r) => {
      acc[r.locationToVisit] = (acc[r.locationToVisit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      approved,
      pending,
      declined,
      totalGuests,
      categoryBreakdown,
      locationBreakdown,
      approvalRate: total > 0 ? ((approved / total) * 100).toFixed(1) : '0',
    };
  }, [requests]);

  const exportToCSV = () => {
    const headers = [
      'Ticket Number',
      'Requester',
      'Department',
      'Visitor Category',
      'Number of Guests',
      'Location',
      'Arrival Date',
      'Status',
      'Created Date',
    ];

    const rows = filteredRequests.map(req => [
      req.ticketNumber,
      req.empDetails.empname,
      req.empDetails.dept,
      req.visitorCategory,
      req.numberOfGuests.toString(),
      req.locationToVisit,
      new Date(req.tentativeArrival).toLocaleDateString('en-IN'),
      req.status,
      new Date(req.creationDatetime).toLocaleDateString('en-IN'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wave-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive visitor request insights</p>
          </div>
          <Button onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approvalRate}%</div>
              <p className="text-xs text-muted-foreground">{stats.approved} approved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGuests}</div>
              <p className="text-xs text-muted-foreground">Across all requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Visitor Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm font-medium">{category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.locationBreakdown).map(([location, count]) => (
                  <div key={location} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-accent" />
                      <span className="text-sm font-medium">{location}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table with Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Detailed Request Data</CardTitle>
                <CardDescription>
                  {filteredRequests.length} of {requests.length} requests shown
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.keys(stats.categoryBreakdown).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterLocation} onValueChange={setFilterLocation}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {Object.keys(stats.locationBreakdown).map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No requests match the selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.ticketNumber}>
                        <TableCell className="font-mono text-sm">{request.ticketNumber}</TableCell>
                        <TableCell>{request.empDetails.empname}</TableCell>
                        <TableCell>{request.empDetails.dept}</TableCell>
                        <TableCell>{request.visitorCategory}</TableCell>
                        <TableCell>{request.numberOfGuests}</TableCell>
                        <TableCell>{request.locationToVisit}</TableCell>
                        <TableCell>
                          {new Date(request.tentativeArrival).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          {request.status === 'approved' && (
                            <Badge className="bg-success text-success-foreground">Approved</Badge>
                          )}
                          {request.status === 'pending' && (
                            <Badge className="bg-warning text-warning-foreground">Pending</Badge>
                          )}
                          {request.status === 'declined' && (
                            <Badge className="bg-destructive text-destructive-foreground">Declined</Badge>
                          )}
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

export default Analytics;
