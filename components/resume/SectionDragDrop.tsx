"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GripVertical, 
  ArrowUpDown, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  Move,
  RotateCcw
} from "lucide-react";
import "./SectionDragDrop.css";

interface ResumeSection {
  id: string;
  title: string;
  component: React.ReactNode;
  visible: boolean;
  locked: boolean;
  order: number;
}

interface SectionDragDropProps {
  sections: ResumeSection[];
  onSectionsChange: (sections: ResumeSection[]) => void;
  onSectionToggle: (sectionId: string) => void;
  onSectionLock: (sectionId: string) => void;
}

export function SectionDragDrop({ 
  sections, 
  onSectionsChange, 
  onSectionToggle, 
  onSectionLock 
}: SectionDragDropProps) {
  const [isEditMode, setIsEditMode] = useState(true);
  const [localSections, setLocalSections] = useState(sections);

  // Update local sections when props change
  useEffect(() => {
    setLocalSections(sections);
  }, [sections]);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(localSections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order numbers
    const updatedSections = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setLocalSections(updatedSections);
    onSectionsChange(updatedSections);
  };

  const resetToDefault = () => {
    const defaultOrder = [
      { id: 'personal', title: 'Personal Information', order: 0 },
      { id: 'summary', title: 'Professional Summary', order: 1 },
      { id: 'experience', title: 'Professional Experience', order: 2 },
      { id: 'education', title: 'Education', order: 3 },
      { id: 'skills', title: 'Technical Skills', order: 4 },
      { id: 'projects', title: 'Projects', order: 5 },
      { id: 'certifications', title: 'Certifications', order: 6 },
      { id: 'awards', title: 'Awards & Achievements', order: 7 }
    ];

    const resetSections = defaultOrder
      .map(defaultSection => {
        const existingSection = localSections.find(s => s.id === defaultSection.id);
        return existingSection ? { ...existingSection, order: defaultSection.order } : null;
      })
      .filter((section): section is ResumeSection => section !== null)
      .sort((a, b) => a.order - b.order);

    setLocalSections(resetSections);
    onSectionsChange(resetSections);
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const currentIndex = localSections.findIndex(s => s.id === sectionId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === localSections.length - 1)
    ) {
      return;
    }

    const newSections = [...localSections];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Swap sections
    [newSections[currentIndex], newSections[targetIndex]] = 
    [newSections[targetIndex], newSections[currentIndex]];

    // Update order numbers
    newSections.forEach((section, index) => {
      section.order = index;
    });

    setLocalSections(newSections);
    onSectionsChange(newSections);
  };

  const handleSectionToggle = (sectionId: string) => {
    const updatedSections = localSections.map(section => 
      section.id === sectionId 
        ? { ...section, visible: !section.visible }
        : section
    );
    
    setLocalSections(updatedSections);
    onSectionToggle(sectionId);
  };

  const handleSectionLock = (sectionId: string) => {
    const updatedSections = localSections.map(section => 
      section.id === sectionId 
        ? { ...section, locked: !section.locked }
        : section
    );
    
    setLocalSections(updatedSections);
    onSectionLock(sectionId);
  };

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Move className="h-5 w-5 text-indigo-600" />
                Resume Section Manager
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Drag to reorder • Toggle visibility • Lock important sections
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="flex items-center gap-2"
              >
                <ArrowUpDown className="h-4 w-4" />
                {isEditMode ? 'Preview Mode' : 'Edit Mode'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefault}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Order
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Section Manager */}
      {isEditMode ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {localSections.map((section, index) => (
                  <Draggable
                    key={section.id}
                    draggableId={section.id}
                    index={index}
                    isDragDisabled={section.locked}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`transition-all duration-200 section-drag-item ${
                          snapshot.isDragging ? 'shadow-2xl scale-105 border-indigo-400 dragging' : 'shadow-md'
                        } ${section.locked ? 'opacity-75 bg-gray-50 locked' : 'bg-white'}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div
                                {...provided.dragHandleProps}
                                className={`cursor-move ${
                                  section.locked ? 'cursor-not-allowed opacity-50' : ''
                                }`}
                              >
                                <GripVertical className="h-5 w-5 text-gray-400" />
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                  #{index + 1}
                                </Badge>
                                <span className="font-medium text-gray-800">
                                  {section.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                {section.locked && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Lock className="h-3 w-3" />
                                    Locked
                                  </Badge>
                                )}
                                {!section.visible && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <EyeOff className="h-3 w-3" />
                                    Hidden
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Move Up/Down Buttons */}
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveSection(section.id, 'up')}
                                  disabled={index === 0}
                                  className="h-6 w-6 p-0 section-move-button"
                                >
                                  <ArrowUpDown className="h-3 w-3 rotate-0" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveSection(section.id, 'down')}
                                  disabled={index === localSections.length - 1}
                                  className="h-6 w-6 p-0 section-move-button"
                                >
                                  <ArrowUpDown className="h-3 w-3 rotate-180" />
                                </Button>
                              </div>

                              {/* Visibility Toggle */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSectionToggle(section.id)}
                                className={`h-8 w-8 p-0 section-visibility-toggle ${
                                  section.visible ? 'visible' : 'hidden'
                                }`}
                              >
                                {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </Button>

                              {/* Lock Toggle */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSectionLock(section.id)}
                                className={`h-8 w-8 p-0 section-lock-toggle ${
                                  section.locked ? 'locked' : 'unlocked'
                                }`}
                              >
                                {section.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          {section.locked && (
                            <p className="text-xs text-gray-500 mt-2 ml-8">
                              This section is locked and cannot be moved
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        /* Preview Mode - Show actual resume sections in new order */
        <div className="space-y-4 section-preview-mode">
          {localSections
            .filter(section => section.visible)
            .sort((a, b) => a.order - b.order)
            .map((section, index) => (
              <div key={section.id} className="relative section-card">
                <Badge 
                  variant="outline" 
                  className="absolute -top-2 -right-2 z-10 bg-purple-50 text-purple-700 border-purple-200 section-number-badge"
                >
                  #{index + 1}
                </Badge>
                {section.component}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
