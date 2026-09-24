"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formSetToSwimInterval,
  nextSwimFormSet,
  totalSwimYards,
  type SwimFormSet,
} from "@/lib/swim-intervals";

type SwimIntervalEditorProps = {
  exerciseIndex: number;
  sets: SwimFormSet[];
  onSetsChange: (sets: SwimFormSet[]) => void;
  getTimeDisplayValue: (
    exerciseIndex: number,
    setIndex: number,
    storedSeconds: number
  ) => string;
  onTimeChange: (exerciseIndex: number, setIndex: number, value: string) => void;
  onTimeBlur: (exerciseIndex: number, setIndex: number) => void;
};

export function SwimIntervalEditor({
  exerciseIndex,
  sets,
  onSetsChange,
  getTimeDisplayValue,
  onTimeChange,
  onTimeBlur,
}: SwimIntervalEditorProps) {
  const intervals = sets.map(formSetToSwimInterval);
  const totalYd = totalSwimYards(intervals);

  const updateRow = (setIndex: number, patch: Partial<SwimFormSet>) => {
    onSetsChange(
      sets.map((set, index) => (index === setIndex ? { ...set, ...patch } : set))
    );
  };

  const addInterval = () => {
    onSetsChange([...sets, nextSwimFormSet(sets[sets.length - 1])]);
  };

  const removeInterval = (setIndex: number) => {
    if (sets.length <= 1) return;
    onSetsChange(sets.filter((_, index) => index !== setIndex));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Intervals</Label>
        <Button type="button" variant="outline" size="sm" onClick={addInterval}>
          <Plus className="mr-1 h-3 w-3" />
          Add interval
        </Button>
      </div>

      <div className="hidden sm:flex items-center gap-3 px-3 text-xs font-medium text-muted-foreground">
        <div className="w-8 shrink-0" aria-hidden />
        <div className="w-16 shrink-0">Reps</div>
        <div className="w-4 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">Yards</div>
        <div className="flex-1 min-w-0">Interval</div>
        <div className="w-8 shrink-0" aria-hidden />
      </div>

      {sets.map((set, setIndex) => (
        <div
          key={setIndex}
          className="flex items-center gap-3 p-3 border rounded-md"
        >
          <div className="font-medium w-8 shrink-0 text-muted-foreground text-sm">
            {setIndex + 1}
          </div>
          <div className="w-16 shrink-0 space-y-1">
            <Label className="text-xs sm:sr-only">Reps</Label>
            <Input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              aria-label={`Interval ${setIndex + 1} reps`}
              value={(set.swimSets ?? 1).toString()}
              onChange={(e) =>
                updateRow(setIndex, {
                  swimSets: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              placeholder="1"
            />
          </div>
          <div className="w-4 shrink-0 text-center text-muted-foreground" aria-hidden>
            ×
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <Label className="text-xs sm:sr-only">Yards</Label>
            <Input
              type="number"
              min="0"
              step="25"
              inputMode="numeric"
              aria-label={`Interval ${setIndex + 1} yards`}
              value={
                set.distance == null || set.distance === 0
                  ? ""
                  : set.distance.toString()
              }
              onChange={(e) => {
                const raw = e.target.value;
                updateRow(setIndex, {
                  distance: raw === "" ? 0 : parseInt(raw, 10) || 0,
                });
              }}
              placeholder="100"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <Label className="text-xs sm:sr-only">Interval (optional)</Label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={5}
              aria-label={`Interval ${setIndex + 1} leave-on time`}
              value={getTimeDisplayValue(
                exerciseIndex,
                setIndex,
                set.time ?? 0
              )}
              onChange={(e) =>
                onTimeChange(exerciseIndex, setIndex, e.target.value)
              }
              onBlur={() => onTimeBlur(exerciseIndex, setIndex)}
              placeholder="m:ss"
            />
          </div>
          {sets.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove interval ${setIndex + 1}`}
              onClick={() => removeInterval(setIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-8 shrink-0" aria-hidden />
          )}
        </div>
      ))}

      <p className="text-sm font-medium pt-1">
        Total: {totalYd.toLocaleString()} yd
      </p>
      <p className="text-xs text-muted-foreground">
        Total yards is the sum of reps × yards. Interval time is optional leave-on
        / clock (m:ss).
      </p>
    </div>
  );
}
