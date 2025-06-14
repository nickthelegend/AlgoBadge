"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, ListChecks, PlayCircle, Repeat, CheckCircle, XCircle, Award } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuizOption {
  id: string
  text: string
}

interface MultipleChoiceQuestion {
  id: string
  text: string
  options: QuizOption[]
  correctAnswerId: string
}

const TIME_PER_QUESTION_SECONDS = 90 // 1.5 minutes per question
const QUESTIONS_PER_QUIZ = 10

const ALL_TRACK_QUESTIONS: Record<string, MultipleChoiceQuestion[]> = {
  Java: [
    {
      id: "j1",
      text: "Which keyword is used to define a class in Java?",
      options: [
        { id: "a", text: "class" },
        { id: "b", text: "Class" },
        { id: "c", text: "def" },
        { id: "d", text: "struct" },
      ],
      correctAnswerId: "a",
    },
    {
      id: "j2",
      text: "What is the entry point of a Java application?",
      options: [
        { id: "a", text: "start()" },
        { id: "b", text: "main()" },
        { id: "c", text: "run()" },
        { id: "d", text: "init()" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "j3",
      text: "Which of these is NOT a primitive data type in Java?",
      options: [
        { id: "a", text: "int" },
        { id: "b", text: "float" },
        { id: "c", text: "String" },
        { id: "d", text: "boolean" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "j4",
      text: "What does 'OOP' stand for in the context of Java?",
      options: [
        { id: "a", text: "Object-Oriented Programming" },
        { id: "b", text: "Open Object Protocol" },
        { id: "c", text: "Ordinal Object Paradigm" },
        { id: "d", text: "Out Of Print" },
      ],
      correctAnswerId: "a",
    },
    {
      id: "j5",
      text: "How do you create an instance of a class in Java?",
      options: [
        { id: "a", text: "new ClassName;" },
        { id: "b", text: "ClassName.create();" },
        { id: "c", text: "new ClassName();" },
        { id: "d", text: "instance ClassName;" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "j6",
      text: "Which collection class allows duplicate elements and maintains insertion order?",
      options: [
        { id: "a", text: "HashSet" },
        { id: "b", text: "ArrayList" },
        { id: "c", text: "HashMap" },
        { id: "d", text: "TreeSet" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "j7",
      text: "What is the 'super' keyword used for in Java?",
      options: [
        { id: "a", text: "To call the superclass constructor or methods" },
        { id: "b", text: "To define a static method" },
        { id: "c", text: "To create a final variable" },
        { id: "d", text: "To indicate a public class" },
      ],
      correctAnswerId: "a",
    },
    {
      id: "j8",
      text: "Which access modifier provides the widest accessibility?",
      options: [
        { id: "a", text: "private" },
        { id: "b", text: "protected" },
        { id: "c", text: "default (package-private)" },
        { id: "d", text: "public" },
      ],
      correctAnswerId: "d",
    },
    {
      id: "j9",
      text: "What is the purpose of the 'finally' block in a try-catch-finally statement?",
      options: [
        { id: "a", text: "To catch exceptions" },
        { id: "b", text: "To execute code only if an exception occurs" },
        { id: "c", text: "To execute code regardless of whether an exception occurs or not" },
        { id: "d", text: "To re-throw an exception" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "j10",
      text: "Which interface must a class implement to be eligible for serialization?",
      options: [
        { id: "a", text: "Runnable" },
        { id: "b", text: "Serializable" },
        { id: "c", text: "Cloneable" },
        { id: "d", text: "Comparable" },
      ],
      correctAnswerId: "b",
    },
  ],
  HTML: [
    {
      id: "h1",
      text: "What does HTML stand for?",
      options: [
        { id: "a", text: "Hyper Trainer Marking Language" },
        { id: "b", text: "Hyper Text Markup Language" },
        { id: "c", text: "High Tech Modern Language" },
        { id: "d", text: "Hyperlink and Text Markup Language" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "h2",
      text: "Which HTML tag is used to define an unordered list?",
      options: [
        { id: "a", text: "<ol>" },
        { id: "b", text: "<li>" },
        { id: "c", text: "<ul>" },
        { id: "d", text: "<list>" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "h3",
      text: "What is the correct HTML element for inserting a line break?",
      options: [
        { id: "a", text: "<break>" },
        { id: "b", text: "<lb>" },
        { id: "c", text: "<br>" },
        { id: "d", text: "<newline>" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "h4",
      text: "Which HTML attribute specifies an alternate text for an image, if the image cannot be displayed?",
      options: [
        { id: "a", text: "src" },
        { id: "b", text: "title" },
        { id: "c", text: "alt" },
        { id: "d", text: "href" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "h5",
      text: "Which HTML element is used to specify a header for a document or section?",
      options: [
        { id: "a", text: "<head>" },
        { id: "b", text: "<header>" },
        { id: "c", text: "<h1>" },
        { id: "d", text: "<top>" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "h6",
      text: "How can you make a numbered list?",
      options: [
        { id: "a", text: "<ul>" },
        { id: "b", text: "<dl>" },
        { id: "c", text: "<list>" },
        { id: "d", text: "<ol>" },
      ],
      correctAnswerId: "d",
    },
    {
      id: "h7",
      text: "Which HTML tag is used to define a hyperlink?",
      options: [
        { id: "a", text: "<link>" },
        { id: "b", text: "<a>" },
        { id: "c", text: "<href>" },
        { id: "d", text: "<hyperlink>" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "h8",
      text: "What is the purpose of the <!DOCTYPE html> declaration?",
      options: [
        { id: "a", text: "It defines the HTML version" },
        { id: "b", text: "It creates a comment" },
        { id: "c", text: "It links to a CSS file" },
        { id: "d", text: "It embeds JavaScript code" },
      ],
      correctAnswerId: "a",
    },
    {
      id: "h9",
      text: "Which HTML element is used to display a scalar measurement within a known range (a gauge)?",
      options: [
        { id: "a", text: "<range>" },
        { id: "b", text: "<progress>" },
        { id: "c", text: "<meter>" },
        { id: "d", text: "<gauge>" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "h10",
      text: "In HTML, which attribute is used to specify that an input field must be filled out?",
      options: [
        { id: "a", text: "validate" },
        { id: "b", text: "placeholder" },
        { id: "c", text: "required" },
        { id: "d", text: "important" },
      ],
      correctAnswerId: "c",
    },
  ],
  Python: [
    {
      id: "p1",
      text: "Which keyword is used to define a function in Python?",
      options: [
        { id: "a", text: "function" },
        { id: "b", text: "def" },
        { id: "c", text: "fun" },
        { id: "d", text: "define" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "p2",
      text: "What is the output of print(type([]))?",
      options: [
        { id: "a", text: "<class 'list'>" },
        { id: "b", text: "<class 'array'>" },
        { id: "c", text: "<class 'tuple'>" },
        { id: "d", text: "<class 'dict'>" },
      ],
      correctAnswerId: "a",
    },
    {
      id: "p3",
      text: "How do you start a multi-line comment in Python?",
      options: [
        { id: "a", text: "// This is a comment" },
        { id: "b", text: "/* This is a comment */" },
        { id: "c", text: "'''This is a comment''' or \"\"\"This is a comment\"\"\"" },
        { id: "d", text: "# This is a comment" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "p4",
      text: "Which of the following is used to create an empty set in Python?",
      options: [
        { id: "a", text: "{}" },
        { id: "b", text: "[]" },
        { id: "c", text: "()" },
        { id: "d", text: "set()" },
      ],
      correctAnswerId: "d",
    },
    {
      id: "p5",
      text: "What will be the output of 'hello'[::-1]?",
      options: [
        { id: "a", text: "hello" },
        { id: "b", text: "olleh" },
        { id: "c", text: "h" },
        { id: "d", text: "Error" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "p6",
      text: "Which method is used to add an element to the end of a list?",
      options: [
        { id: "a", text: "add()" },
        { id: "b", text: "insert()" },
        { id: "c", text: "push()" },
        { id: "d", text: "append()" },
      ],
      correctAnswerId: "d",
    },
    {
      id: "p7",
      text: "What does the 'pass' statement do in Python?",
      options: [
        { id: "a", text: "It exits the loop" },
        { id: "b", text: "It skips the current iteration" },
        { id: "c", text: "It is a null operation; nothing happens" },
        { id: "d", text: "It raises an exception" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "p8",
      text: "How do you get the number of elements in a list named 'my_list'?",
      options: [
        { id: "a", text: "my_list.size()" },
        { id: "b", text: "len(my_list)" },
        { id: "c", text: "my_list.length" },
        { id: "d", text: "count(my_list)" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "p9",
      text: "Which keyword is used for exception handling in Python?",
      options: [
        { id: "a", text: "catch" },
        { id: "b", text: "throw" },
        { id: "c", text: "try...except" },
        { id: "d", text: "handle" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "p10",
      text: "What is a lambda function in Python?",
      options: [
        { id: "a", text: "A multi-line function" },
        { id: "b", text: "A named function" },
        { id: "c", text: "A small, anonymous function" },
        { id: "d", text: "A recursive function" },
      ],
      correctAnswerId: "c",
    },
  ],
  "Algorand SDK": [
    {
      id: "a1",
      text: "Which Algorand SDK function is used to generate a new account?",
      options: [
        { id: "a", text: "account.generate()" },
        { id: "b", text: "algosdk.account.generate_account()" },
        { id: "c", text: "new Account()" },
        { id: "d", text: "create_algorand_account()" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "a2",
      text: "What is the primary unit of currency on the Algorand network?",
      options: [
        { id: "a", text: "Ether" },
        { id: "b", text: "Algo" },
        { id: "c", text: "Satoshi" },
        { id: "d", text: "TokenA" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "a3",
      text: "Which class is used to construct a payment transaction in the Python Algorand SDK?",
      options: [
        { id: "a", text: "PaymentTxn" },
        { id: "b", text: "transaction.PaymentTxn" },
        { id: "c", text: "AssetTransferTxn" },
        { id: "d", text: "algosdk.transaction.PaymentTxn" },
      ],
      correctAnswerId: "d",
    },
    {
      id: "a4",
      text: "What is an ASA in Algorand?",
      options: [
        { id: "a", text: "Algorand Secure Asset" },
        { id: "b", text: "Algorand Standard Asset" },
        { id: "c", text: "Algorand System Account" },
        { id: "d", text: "Algorand Smart Application" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "a5",
      text: "To interact with the Algorand network, you typically need clients for `algod` and what other service?",
      options: [
        { id: "a", text: "FTP Server" },
        { id: "b", text: "Indexer" },
        { id: "c", text: "Database" },
        { id: "d", text: "Web Server" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "a6",
      text: "What is the process of agreeing to receive a specific ASA called?",
      options: [
        { id: "a", text: "Subscription" },
        { id: "b", text: "Asset Opt-In" },
        { id: "c", text: "Token Approval" },
        { id: "d", text: "ASA Registration" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "a7",
      text: "Which field in a transaction specifies the sender's address?",
      options: [
        { id: "a", text: "from_addr" },
        { id: "b", text: "sender" },
        { id: "c", text: "source" },
        { id: "d", text: "originator" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "a8",
      text: "What is the maximum number of transactions that can be grouped atomically in Algorand?",
      options: [
        { id: "a", text: "8" },
        { id: "b", text: "16" },
        { id: "c", text: "32" },
        { id: "d", text: "Unlimited" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "a9",
      text: "In PyTeal, what is the typical return value of a smart contract approval program for a successful transaction?",
      options: [
        { id: "a", text: "True" },
        { id: "b", text: "0" },
        { id: "c", text: "1" },
        { id: "d", text: "'Approved'" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "a10",
      text: "What is a Mnemonic in the context of Algorand accounts?",
      options: [
        { id: "a", text: "A type of smart contract" },
        { id: "b", text: "A human-readable representation of a private key" },
        { id: "c", text: "A network identifier" },
        { id: "d", text: "A transaction fee" },
      ],
      correctAnswerId: "b",
    },
  ],
  JavaScript: [
    {
      id: "js1",
      text: "Which keyword is used to declare a variable that can be reassigned?",
      options: [
        { id: "a", text: "const" },
        { id: "b", text: "var" },
        { id: "c", text: "let" },
        { id: "d", text: "Both b and c" },
      ],
      correctAnswerId: "d",
    },
    {
      id: "js2",
      text: "What does 'DOM' stand for?",
      options: [
        { id: "a", text: "Document Object Model" },
        { id: "b", text: "Data Object Model" },
        { id: "c", text: "Display Output Module" },
        { id: "d", text: "Digital Order Mechanism" },
      ],
      correctAnswerId: "a",
    },
    {
      id: "js3",
      text: "How do you write a single-line comment in JavaScript?",
      options: [
        { id: "a", text: "<!-- comment -->" },
        { id: "b", text: "/* comment */" },
        { id: "c", text: "// comment" },
        { id: "d", text: "# comment" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "js4",
      text: "Which method is used to add an element to the end of an array?",
      options: [
        { id: "a", text: "append()" },
        { id: "b", text: "push()" },
        { id: "c", text: "addToEnd()" },
        { id: "d", text: "insertLast()" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "js5",
      text: "What is the result of '5' == 5 in JavaScript?",
      options: [
        { id: "a", text: "true" },
        { id: "b", text: "false" },
        { id: "c", text: "TypeError" },
        { id: "d", text: "undefined" },
      ],
      correctAnswerId: "a",
    },
    {
      id: "js6",
      text: "What is the result of '5' === 5 in JavaScript?",
      options: [
        { id: "a", text: "true" },
        { id: "b", text: "false" },
        { id: "c", text: "TypeError" },
        { id: "d", text: "undefined" },
      ],
      correctAnswerId: "b",
    },
    {
      id: "js7",
      text: "Which function is used to parse a JSON string into a JavaScript object?",
      options: [
        { id: "a", text: "JSON.parse()" },
        { id: "b", text: "JSON.stringify()" },
        { id: "c", text: "JSON.toObject()" },
        { id: "d", text: "JSON.convert()" },
      ],
      correctAnswerId: "a",
    },
    {
      id: "js8",
      text: "What does `NaN` stand for?",
      options: [
        { id: "a", text: "Not a Name" },
        { id: "b", text: "No Available Number" },
        { id: "c", text: "Not a Number" },
        { id: "d", text: "Negative And Null" },
      ],
      correctAnswerId: "c",
    },
    {
      id: "js9",
      text: "Which of these is a way to create an object in JavaScript?",
      options: [
        { id: "a", text: "Using object literal {}" },
        { id: "b", text: "Using new Object()" },
        { id: "c", text: "Using a constructor function" },
        { id: "d", text: "All of the above" },
      ],
      correctAnswerId: "d",
    },
    {
      id: "js10",
      text: "What is a 'closure' in JavaScript?",
      options: [
        { id: "a", text: "A way to close the browser window" },
        {
          id: "b",
          text: "A function having access to its own scope, the outer function's scope, and the global scope",
        },
        { id: "c", text: "A built-in JavaScript method" },
        { id: "d", text: "A type of loop" },
      ],
      correctAnswerId: "b",
    },
  ],
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
}

export default function QuizPage() {
  const [quizState, setQuizState] = useState<"setup" | "in_progress" | "results">("setup")
  const [selectedTechnology, setSelectedTechnology] = useState<string | null>(null)
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<MultipleChoiceQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [score, setScore] = useState(0)
  const [showAnswerStatus, setShowAnswerStatus] = useState(false)

  const technologies = useMemo(() => Object.keys(ALL_TRACK_QUESTIONS), [])

  const loadQuiz = useCallback((technology: string) => {
    const questions = ALL_TRACK_QUESTIONS[technology] || []
    if (questions.length < QUESTIONS_PER_QUIZ) {
      console.warn(
        `Warning: Not enough questions for ${technology}. Found ${questions.length}, need ${QUESTIONS_PER_QUIZ}. Using available questions.`,
      )
    }
    const selectedQuestions = questions.slice(0, QUESTIONS_PER_QUIZ) // Take up to 10 questions

    setCurrentQuizQuestions(selectedQuestions)
    setUserAnswers(new Array(selectedQuestions.length).fill(null))
    setCurrentQuestionIndex(0)
    setTimeLeft(selectedQuestions.length * TIME_PER_QUESTION_SECONDS)
    setScore(0)
    setShowAnswerStatus(false)
  }, [])

  const handleStartQuiz = () => {
    if (selectedTechnology) {
      loadQuiz(selectedTechnology)
      setQuizState("in_progress")
    }
  }

  useEffect(() => {
    if (quizState === "in_progress" && timeLeft > 0) {
      const timerId = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1)
      }, 1000)
      return () => clearInterval(timerId)
    } else if (quizState === "in_progress" && timeLeft === 0) {
      handleQuizEnd()
    }
  }, [quizState, timeLeft])

  const handleAnswerSelect = (optionId: string) => {
    const newAnswers = [...userAnswers]
    newAnswers[currentQuestionIndex] = optionId
    setUserAnswers(newAnswers)
    setShowAnswerStatus(true)
  }

  const handleNextQuestion = () => {
    setShowAnswerStatus(false)
    if (currentQuestionIndex < currentQuizQuestions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1)
    } else {
      handleQuizEnd()
    }
  }

  const handleQuizEnd = useCallback(() => {
    let calculatedScore = 0
    currentQuizQuestions.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswerId) {
        calculatedScore++
      }
    })
    setScore(calculatedScore)
    setQuizState("results")
    setTimeLeft(0)
  }, [currentQuizQuestions, userAnswers])

  const handleRestartQuiz = () => {
    setSelectedTechnology(null)
    setQuizState("setup")
  }

  if (quizState === "setup") {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <ListChecks className="mr-2 h-6 w-6 text-primary" />
              Select Quiz Track
            </CardTitle>
            <CardDescription>Choose a technology to test your knowledge.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="technology-select" className="text-sm font-medium">
                Technology Track
              </label>
              <Select value={selectedTechnology || ""} onValueChange={setSelectedTechnology}>
                <SelectTrigger id="technology-select">
                  <SelectValue placeholder="Select Technology" />
                </SelectTrigger>
                <SelectContent>
                  {technologies.map((tech) => (
                    <SelectItem key={tech} value={tech}>
                      {tech}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Each quiz has {QUESTIONS_PER_QUIZ} questions. You'll have {formatTime(TIME_PER_QUESTION_SECONDS)} per
              question.
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleStartQuiz} disabled={!selectedTechnology}>
              <PlayCircle className="mr-2 h-5 w-5" /> Start Quiz
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (quizState === "in_progress" && currentQuizQuestions.length > 0) {
    const currentQuestion = currentQuizQuestions[currentQuestionIndex]
    const progressPercentage = ((currentQuestionIndex + 1) / currentQuizQuestions.length) * 100
    const selectedOptionId = userAnswers[currentQuestionIndex]

    return (
      <div className="container mx-auto p-4 flex flex-col items-center min-h-screen py-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <CardTitle className="text-xl md:text-2xl">{selectedTechnology} Quiz</CardTitle>
              <div className="flex items-center text-lg font-semibold text-primary">
                <Clock className="mr-2 h-5 w-5" /> {formatTime(timeLeft)}
              </div>
            </div>
            <CardDescription>
              Question {currentQuestionIndex + 1} of {currentQuizQuestions.length}
            </CardDescription>
            <Progress value={progressPercentage} className="w-full mt-2 h-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg font-medium leading-relaxed">{currentQuestion?.text}</p>
            <div className="space-y-3">
              {currentQuestion?.options.map((option) => {
                const isSelected = selectedOptionId === option.id
                const isCorrect = option.id === currentQuestion.correctAnswerId

                let buttonVariant: "outline" | "default" | "secondary" | "destructive" = "outline"
                let icon = null

                if (showAnswerStatus && isSelected) {
                  buttonVariant = isCorrect ? "default" : "destructive"
                  icon = isCorrect ? <CheckCircle className="mr-2 h-5 w-5" /> : <XCircle className="mr-2 h-5 w-5" />
                } else if (isSelected) {
                  buttonVariant = "secondary"
                }

                return (
                  <Button
                    key={option.id}
                    variant={buttonVariant}
                    className={cn(
                      "w-full justify-start text-left h-auto py-3 px-4 whitespace-normal",
                      showAnswerStatus &&
                        isSelected &&
                        isCorrect &&
                        "bg-green-500 hover:bg-green-600 text-white border-green-500",
                      showAnswerStatus &&
                        isSelected &&
                        !isCorrect &&
                        "bg-red-500 hover:bg-red-600 text-white border-red-500",
                      showAnswerStatus &&
                        !isSelected &&
                        isCorrect &&
                        "border-green-500 text-green-700 dark:text-green-400",
                    )}
                    onClick={() => !showAnswerStatus && handleAnswerSelect(option.id)}
                    disabled={showAnswerStatus}
                  >
                    {icon}
                    <span className="font-mono mr-3 text-sm bg-muted px-1.5 py-0.5 rounded">
                      {option.id.toUpperCase()}.
                    </span>
                    {option.text}
                  </Button>
                )
              })}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleNextQuestion} disabled={!selectedOptionId && !showAnswerStatus}>
              {currentQuestionIndex === currentQuizQuestions.length - 1 ? "Finish Quiz" : "Next Question"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (quizState === "results") {
    // Placeholder Asset ID - replace with actual Asset ID for each badge type
    const placeholderAssetId = "123456789"
    const badgeName = selectedTechnology ? `${selectedTechnology} Proficiency Badge` : "Quiz Badge"

    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center">
              <Award className="mr-3 h-8 w-8" /> Quiz Completed!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-5xl font-extrabold">🎉</p>
            <p className="text-2xl font-semibold">Yeaah you have qualified for the {badgeName}!</p>
            <p className="text-muted-foreground">
              You correctly answered {score} out of {currentQuizQuestions.length} questions.
            </p>
            <div className="mt-6 p-4 border-t border-border bg-secondary/30 rounded-md">
              <h3 className="text-lg font-semibold mb-2">Next Steps for Your Badge:</h3>
              <p className="text-sm text-muted-foreground">
                Your badge issuance is pending. It will be awarded after an admin and a teacher review and sign the
                transaction.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                To receive your <span className="font-semibold">{badgeName}</span> (Asset ID:{" "}
                <span className="font-mono bg-muted px-1 rounded">{placeholderAssetId}</span>), you MUST OPT-IN to this
                Asset ID in your Algorand wallet.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                (Note: The Asset ID shown is a placeholder. Actual Asset IDs will be provided upon system integration.)
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-3">
            <Button className="w-full" onClick={handleRestartQuiz}>
              <Repeat className="mr-2 h-5 w-5" /> Take Another Quiz
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/verify">Apply for Other Badges</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return null
}
