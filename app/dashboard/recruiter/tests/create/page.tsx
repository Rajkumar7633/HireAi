// "use client";

// import type React from "react";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useToast } from "@/hooks/use-toast";
// import { Loader2, Plus, Trash2 } from "lucide-react";

// interface Question {
//   questionText: string;
//   type: "multiple_choice" | "short_answer" | "code_snippet";
//   options: string[];
//   correctAnswer: string;
// }

// export default function CreateTestPage() {
//   const router = useRouter();
//   const { toast } = useToast();

//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [durationMinutes, setDurationMinutes] = useState(60);
//   const [questions, setQuestions] = useState<Question[]>([
//     {
//       questionText: "",
//       type: "multiple_choice",
//       options: ["", "", "", ""],
//       correctAnswer: "",
//     },
//   ]);
//   const [loading, setLoading] = useState(false);

//   const addQuestion = () => {
//     setQuestions([
//       ...questions,
//       {
//         questionText: "",
//         type: "multiple_choice",
//         options: ["", "", "", ""],
//         correctAnswer: "",
//       },
//     ]);
//   };

//   const removeQuestion = (index: number) => {
//     if (questions.length > 1) {
//       setQuestions(questions.filter((_, i) => i !== index));
//     }
//   };

//   const updateQuestion = (index: number, field: keyof Question, value: any) => {
//     const updatedQuestions = [...questions];
//     updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
//     setQuestions(updatedQuestions);
//   };

//   const updateOption = (
//     questionIndex: number,
//     optionIndex: number,
//     value: string
//   ) => {
//     const updatedQuestions = [...questions];
//     updatedQuestions[questionIndex].options[optionIndex] = value;
//     setQuestions(updatedQuestions);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     if (!title || !durationMinutes || questions.some((q) => !q.questionText)) {
//       toast({
//         title: "Validation Error",
//         description: "Please fill in all required fields.",
//         variant: "destructive",
//       });
//       return;
//     }

//     setLoading(true);
//     try {
//       console.log("[v0] Starting test creation...");
//       const testData = {
//         title,
//         description,
//         durationMinutes,
//         questions: questions.filter((q) => q.questionText.trim() !== ""),
//       };
//       console.log("[v0] Test data:", testData);

//       const response = await fetch("/api/tests", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(testData),
//       });

//       console.log("[v0] Response status:", response.status);
//       console.log("[v0] Response ok:", response.ok);

//       const responseData = await response.json();
//       console.log("[v0] Response data:", responseData);

//       if (response.ok) {
//         console.log("[v0] Test created successfully");
//         toast({
//           title: "Test Created",
//           description: "Test has been created successfully.",
//         });
//         router.push("/dashboard/recruiter/tests");
//       } else {
//         console.log("[v0] Test creation failed:", responseData);
//         toast({
//           title: "Creation Failed",
//           description:
//             responseData.message ||
//             "An error occurred while creating the test.",
//           variant: "destructive",
//         });
//       }
//     } catch (error) {
//       console.error("[v0] Create test error:", error);
//       toast({
//         title: "Error",
//         description: "Network error. Please try again.",
//         variant: "destructive",
//       });
//     } finally {
//       console.log("[v0] Setting loading to false");
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-6 max-w-4xl mx-auto">
//       <Card>
//         <CardHeader>
//           <CardTitle>Create New Test</CardTitle>
//           <CardDescription>
//             Create a test to evaluate candidates for your job positions.
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-6">
//             <div className="space-y-2">
//               <Label htmlFor="title">Test Title</Label>
//               <Input
//                 id="title"
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 placeholder="e.g., Frontend Developer Assessment"
//                 required
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="description">Description (Optional)</Label>
//               <Textarea
//                 id="description"
//                 value={description}
//                 onChange={(e) => setDescription(e.target.value)}
//                 placeholder="Brief description of what this test evaluates..."
//                 rows={3}
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="duration">Duration (Minutes)</Label>
//               <Input
//                 id="duration"
//                 type="number"
//                 value={durationMinutes}
//                 onChange={(e) =>
//                   setDurationMinutes(Number.parseInt(e.target.value) || 60)
//                 }
//                 min="5"
//                 max="180"
//                 required
//               />
//             </div>

//             <div className="space-y-4">
//               <div className="flex justify-between items-center">
//                 <Label className="text-lg font-semibold">Questions</Label>
//                 <Button type="button" onClick={addQuestion} variant="outline">
//                   <Plus className="mr-2 h-4 w-4" />
//                   Add Question
//                 </Button>
//               </div>

//               {questions.map((question, questionIndex) => (
//                 <Card key={questionIndex} className="p-4">
//                   <div className="space-y-4">
//                     <div className="flex justify-between items-start">
//                       <Label className="text-base font-medium">
//                         Question {questionIndex + 1}
//                       </Label>
//                       {questions.length > 1 && (
//                         <Button
//                           type="button"
//                           variant="destructive"
//                           size="sm"
//                           onClick={() => removeQuestion(questionIndex)}
//                         >
//                           <Trash2 className="h-4 w-4" />
//                         </Button>
//                       )}
//                     </div>

//                     <div className="space-y-2">
//                       <Label>Question Text</Label>
//                       <Textarea
//                         value={question.questionText}
//                         onChange={(e) =>
//                           updateQuestion(
//                             questionIndex,
//                             "questionText",
//                             e.target.value
//                           )
//                         }
//                         placeholder="Enter your question here..."
//                         required
//                       />
//                     </div>

//                     <div className="space-y-2">
//                       <Label>Question Type</Label>
//                       <Select
//                         value={question.type}
//                         onValueChange={(value) =>
//                           updateQuestion(questionIndex, "type", value)
//                         }
//                       >
//                         <SelectTrigger>
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="multiple_choice">
//                             Multiple Choice
//                           </SelectItem>
//                           <SelectItem value="short_answer">
//                             Short Answer
//                           </SelectItem>
//                           <SelectItem value="code_snippet">
//                             Code Snippet
//                           </SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </div>

//                     {question.type === "multiple_choice" && (
//                       <div className="space-y-2">
//                         <Label>Options</Label>
//                         {question.options.map((option, optionIndex) => (
//                           <Input
//                             key={optionIndex}
//                             value={option}
//                             onChange={(e) =>
//                               updateOption(
//                                 questionIndex,
//                                 optionIndex,
//                                 e.target.value
//                               )
//                             }
//                             placeholder={`Option ${optionIndex + 1}`}
//                           />
//                         ))}
//                         <div className="space-y-2">
//                           <Label>Correct Answer</Label>
//                           <Select
//                             value={question.correctAnswer}
//                             onValueChange={(value) =>
//                               updateQuestion(
//                                 questionIndex,
//                                 "correctAnswer",
//                                 value
//                               )
//                             }
//                           >
//                             <SelectTrigger>
//                               <SelectValue placeholder="Select correct answer" />
//                             </SelectTrigger>
//                             <SelectContent>
//                               {question.options.map(
//                                 (option, idx) =>
//                                   option && (
//                                     <SelectItem key={idx} value={option}>
//                                       {option}
//                                     </SelectItem>
//                                   )
//                               )}
//                             </SelectContent>
//                           </Select>
//                         </div>
//                       </div>
//                     )}

//                     {(question.type === "short_answer" ||
//                       question.type === "code_snippet") && (
//                       <div className="space-y-2">
//                         <Label>
//                           Sample/Expected Answer (for scoring reference)
//                         </Label>
//                         <Textarea
//                           value={question.correctAnswer}
//                           onChange={(e) =>
//                             updateQuestion(
//                               questionIndex,
//                               "correctAnswer",
//                               e.target.value
//                             )
//                           }
//                           placeholder="Enter expected answer or keywords..."
//                           rows={question.type === "code_snippet" ? 6 : 3}
//                         />
//                       </div>
//                     )}
//                   </div>
//                 </Card>
//               ))}
//             </div>

//             <Button type="submit" className="w-full" disabled={loading}>
//               {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
//               Create Test
//             </Button>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import PremiumTestBuilder from "@/components/premium-test-builder";

export default function CreateTestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (testData: any) => {
    setLoading(true);
    try {
      console.log("[v0] Starting premium test creation...");
      console.log("[v0] Test data:", testData);

      const response = await fetch("/api/tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      });

      console.log("[v0] Response status:", response.status);
      console.log("[v0] Response ok:", response.ok);

      const responseData = await response.json();
      console.log("[v0] Response data:", responseData);

      if (response.ok) {
        console.log("[v0] Premium test created successfully");
        toast({
          title: "🎉 Test Created Successfully!",
          description:
            "Your premium test has been created and is ready to use.",
        });
        router.push("/dashboard/recruiter/tests");
      } else {
        console.log("[v0] Test creation failed:", responseData);
        toast({
          title: "Creation Failed",
          description:
            responseData.message ||
            "An error occurred while creating the test.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[v0] Create test error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log("[v0] Setting loading to false");
      setLoading(false);
    }
  };

  return <PremiumTestBuilder onSubmit={handleSubmit} loading={loading} />;
}
