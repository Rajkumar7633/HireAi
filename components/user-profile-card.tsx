import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { MapPin, Calendar, Briefcase, Star, Edit } from "lucide-react";

export function UserProfileCard() {
  return (
    <Card className="w-full max-w-md mx-auto bg-white shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src="/professional-headshot.png"
                alt="Sarah Johnson"
              />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                SJ
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Sarah Johnson
              </h3>
              <p className="text-gray-600">Senior Software Engineer</p>
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <MapPin className="h-4 w-4 mr-1" />
                San Francisco, CA
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>5 years experience</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Briefcase className="h-4 w-4 mr-2" />
            <span>Remote</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-700 hover:bg-blue-100"
          >
            React
          </Badge>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-700 hover:bg-green-100"
          >
            Node.js
          </Badge>
          <Badge
            variant="secondary"
            className="bg-purple-100 text-purple-700 hover:bg-purple-100"
          >
            TypeScript
          </Badge>
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-700 hover:bg-orange-100"
          >
            AWS
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600 ml-2">
              4.9 (127 reviews)
            </span>
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
            View Profile
          </Button>
          <Button variant="outline" className="flex-1 bg-transparent">
            Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
