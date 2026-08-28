import { Settings as SettingsIcon, Trash2 } from "lucide-react";
import { getCurrentUserOrDemo } from "@/lib/auth";
import { getUserLeagues } from "@/lib/queries/leagues";
import { SCORING_FORMAT_LABELS } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createLeagueAction, deleteLeagueAction, updateLeagueAction, updateLeagueSettingsAction, updateMflConfigAction } from "./actions";

const SCORING_FORMATS = Object.entries(SCORING_FORMAT_LABELS);

function NumberField({ name, label, defaultValue, step = 1 }: { name: string; label: string; defaultValue: number; step?: number }) {
  return (
    <div>
      <Label htmlFor={name} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input id={name} name={name} type="number" step={step} defaultValue={defaultValue} className="mt-1 h-8" />
    </div>
  );
}

export default async function SettingsPage() {
  const user = await getCurrentUserOrDemo();
  const leagues = await getUserLeagues(user.id);

  return (
    <div>
      <PageHeader title="Settings" description="Manage league configurations, scoring rules, and roster requirements." />

      <div className="space-y-6">
        {leagues.map((league) => {
          const s = league.settings!;
          const updateLeagueWithId = updateLeagueAction.bind(null, league.id);
          const updateSettingsWithId = updateLeagueSettingsAction.bind(null, league.id);
          const updateMflWithId = updateMflConfigAction.bind(null, league.id);
          const deleteWithId = deleteLeagueAction.bind(null, league.id);

          return (
            <Card key={league.id} className="border-border/70">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{league.name}</CardTitle>
                  <Badge variant="outline">{league.teamCount} teams</Badge>
                  <Badge variant="outline">{SCORING_FORMAT_LABELS[league.scoringFormatPreset]}</Badge>
                </div>
                {leagues.length > 1 ? (
                  <form action={deleteWithId}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-400" type="submit">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-6">
                <form action={updateLeagueWithId} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor={`name-${league.id}`} className="text-xs text-muted-foreground">
                      League name
                    </Label>
                    <Input id={`name-${league.id}`} name="name" defaultValue={league.name} className="mt-1 h-8" />
                  </div>
                  <div>
                    <Label htmlFor={`teamCount-${league.id}`} className="text-xs text-muted-foreground">
                      Team count
                    </Label>
                    <Input
                      id={`teamCount-${league.id}`}
                      name="teamCount"
                      type="number"
                      min={4}
                      max={20}
                      defaultValue={league.teamCount}
                      className="mt-1 h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`format-${league.id}`} className="text-xs text-muted-foreground">
                      Scoring preset
                    </Label>
                    <select
                      id={`format-${league.id}`}
                      name="scoringFormatPreset"
                      defaultValue={league.scoringFormatPreset}
                      className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {SCORING_FORMATS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <Button type="submit" size="sm" variant="outline">
                      Save league info
                    </Button>
                  </div>
                </form>

                <form action={updateSettingsWithId} className="space-y-4 border-t border-border pt-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scoring</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <NumberField name="passingTDPoints" label="Pass TD" defaultValue={s.passingTDPoints} step={0.5} />
                      <NumberField name="passingYardPoints" label="Pass Yard" defaultValue={s.passingYardPoints} step={0.01} />
                      <NumberField name="interceptionPoints" label="Interception" defaultValue={s.interceptionPoints} step={0.5} />
                      <NumberField name="rushingTDPoints" label="Rush TD" defaultValue={s.rushingTDPoints} step={0.5} />
                      <NumberField name="rushingYardPoints" label="Rush Yard" defaultValue={s.rushingYardPoints} step={0.01} />
                      <NumberField name="receivingTDPoints" label="Rec TD" defaultValue={s.receivingTDPoints} step={0.5} />
                      <NumberField name="receivingYardPoints" label="Rec Yard" defaultValue={s.receivingYardPoints} step={0.01} />
                      <NumberField name="receptionPoints" label="Reception (PPR)" defaultValue={s.receptionPoints} step={0.25} />
                      <NumberField name="tePremiumBonus" label="TE Premium Bonus" defaultValue={s.tePremiumBonus} step={0.25} />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Roster</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <NumberField name="qbSlots" label="QB" defaultValue={s.qbSlots} />
                      <NumberField name="rbSlots" label="RB" defaultValue={s.rbSlots} />
                      <NumberField name="wrSlots" label="WR" defaultValue={s.wrSlots} />
                      <NumberField name="teSlots" label="TE" defaultValue={s.teSlots} />
                      <NumberField name="flexSlots" label="FLEX" defaultValue={s.flexSlots} />
                      <NumberField name="superflexSlots" label="Superflex" defaultValue={s.superflexSlots} />
                      <NumberField name="benchSize" label="Bench" defaultValue={s.benchSize} />
                    </div>
                    <div className="mt-3 flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="kSlot" defaultChecked={s.kSlot} className="h-4 w-4 rounded border-input" />
                        Kicker
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="dstSlot" defaultChecked={s.dstSlot} className="h-4 w-4 rounded border-input" />
                        Defense/Special Teams
                      </label>
                    </div>
                  </div>

                  <Button type="submit" size="sm">
                    Save scoring &amp; roster settings
                  </Button>
                </form>

                <form action={updateMflWithId} className="space-y-3 border-t border-border pt-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">MyFantasyLeague Sync</p>
                    <p className="text-xs text-muted-foreground">
                      Lets Draft Day pull picks from a live MFL draft. Find these in your league&apos;s URL: myfantasyleague.com/2026/home?L=12345 on host www45.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <Label htmlFor={`mflLeagueId-${league.id}`} className="text-xs text-muted-foreground">
                        MFL League ID
                      </Label>
                      <Input id={`mflLeagueId-${league.id}`} name="mflLeagueId" placeholder="37681" defaultValue={league.mflLeagueId ?? ""} className="mt-1 h-8" />
                    </div>
                    <div>
                      <Label htmlFor={`mflHost-${league.id}`} className="text-xs text-muted-foreground">
                        MFL Host
                      </Label>
                      <Input id={`mflHost-${league.id}`} name="mflHost" placeholder="www45" defaultValue={league.mflHost ?? ""} className="mt-1 h-8" />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" size="sm" variant="outline">
                        Save MFL sync
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 border-dashed border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Create another league configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLeagueAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
            <div>
              <Label htmlFor="new-name" className="text-xs text-muted-foreground">
                League name
              </Label>
              <Input id="new-name" name="name" placeholder="Dynasty League" required className="mt-1 h-9" />
            </div>
            <div>
              <Label htmlFor="new-teamCount" className="text-xs text-muted-foreground">
                Team count
              </Label>
              <Input id="new-teamCount" name="teamCount" type="number" min={4} max={20} defaultValue={12} className="mt-1 h-9" />
            </div>
            <div>
              <Label htmlFor="new-format" className="text-xs text-muted-foreground">
                Scoring preset
              </Label>
              <select id="new-format" name="scoringFormatPreset" defaultValue="PPR" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                {SCORING_FORMATS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Create league</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
