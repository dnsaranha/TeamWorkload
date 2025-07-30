import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Employee {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  workload: number; // percentage
}

interface Project {
  id: string;
  name: string;
  progress: number; // percentage
  workload: number; // percentage
}

interface WorkloadSummaryProps {
  employees?: Employee[];
  projects?: Project[];
  period?: string;
  onPeriodChange?: (period: string) => void;
}

const WorkloadSummary = ({
  employees = [
    {
      id: "1",
      name: "John Doe",
      role: "Developer",
      workload: 120,
      avatar: "JD",
    },
    {
      id: "2",
      name: "Jane Smith",
      role: "Designer",
      workload: 85,
      avatar: "JS",
    },
    {
      id: "3",
      name: "Mike Johnson",
      role: "QA Engineer",
      workload: 45,
      avatar: "MJ",
    },
    {
      id: "4",
      name: "Sarah Williams",
      role: "Project Manager",
      workload: 95,
      avatar: "SW",
    },
    {
      id: "5",
      name: "David Brown",
      role: "Developer",
      workload: 110,
      avatar: "DB",
    },
  ],
  projects = [
    { id: "1", name: "Website Redesign", progress: 65, workload: 90 },
    { id: "2", name: "Mobile App", progress: 30, workload: 120 },
    { id: "3", name: "CRM Integration", progress: 80, workload: 75 },
    { id: "4", name: "E-commerce Platform", progress: 45, workload: 60 },
  ],
  period = "This Week",
  onPeriodChange = () => {},
}: WorkloadSummaryProps) => {
  const [activeTab, setActiveTab] = useState("employees");

  const getWorkloadColor = (workload: number) => {
    if (workload > 100) return "bg-red-500";
    if (workload >= 50) return "bg-amber-500";
    return "bg-green-500";
  };

  const getWorkloadBadge = (workload: number) => {
    if (workload > 100) return "destructive";
    if (workload >= 50) return "default";
    return "secondary";
  };

  return (
    <Card className="h-full bg-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            Workload Summary
          </CardTitle>
          <Select defaultValue={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="This Week">This Week</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="This Quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="px-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ScrollArea className="h-[600px] pr-4">
            <TabsContent value="employees" className="mt-0">
              <div className="space-y-4">
                {employees.map((employee) => (
                  <div key={employee.id} className="p-3 rounded-lg border">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar>
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.avatar}`}
                        />
                        <AvatarFallback>{employee.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium text-sm">{employee.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {employee.role}
                        </p>
                      </div>
                      <Badge
                        variant={getWorkloadBadge(employee.workload)}
                        className="ml-auto"
                      >
                        {employee.workload}%
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Workload</span>
                        <span
                          className={
                            employee.workload > 100
                              ? "text-red-500 font-medium"
                              : ""
                          }
                        >
                          {employee.workload}%
                        </span>
                      </div>
                      <Progress
                        value={employee.workload}
                        max={150}
                        className={`h-2 ${getWorkloadColor(employee.workload)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="projects" className="mt-0">
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">{project.name}</h4>
                      <Badge variant={getWorkloadBadge(project.workload)}>
                        {project.workload}%
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Workload</span>
                          <span
                            className={
                              project.workload > 100
                                ? "text-red-500 font-medium"
                                : ""
                            }
                          >
                            {project.workload}%
                          </span>
                        </div>
                        <Progress
                          value={project.workload}
                          max={150}
                          className={`h-2 ${getWorkloadColor(project.workload)}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WorkloadSummary;
