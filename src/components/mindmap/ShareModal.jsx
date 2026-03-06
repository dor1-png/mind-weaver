import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, UserPlus, Trash2, Link, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ShareModal({ map, user, onClose }) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: collaborators = [] } = useQuery({
    queryKey: ["collaborators", map.id],
    queryFn: () => base44.entities.MindMapCollaborator.filter({ map_id: map.id }),
  });

  const invite = useMutation({
    mutationFn: async (inviteEmail) => {
      const existing = collaborators.find((c) => c.collaborator_email === inviteEmail);
      if (existing) throw new Error("Already invited");
      if (inviteEmail === user.email) throw new Error("That's you!");
      return base44.entities.MindMapCollaborator.create({
        map_id: map.id,
        owner_id: user.id,
        collaborator_email: inviteEmail,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators", map.id] });
      setEmail("");
      toast.success("Invitation sent!");
    },
    onError: (err) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.MindMapCollaborator.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collaborators", map.id] }),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Share "{map.title}"</h2>
            <p className="text-sm text-slate-500 mt-0.5">Invite people to collaborate</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Invite form */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (email.trim()) invite.mutate(email.trim().toLowerCase()); }}
          className="flex gap-2 mb-5"
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address..."
            className="h-10 rounded-xl flex-1"
          />
          <Button type="submit" disabled={!email.trim() || invite.isPending} className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-900">
            <UserPlus className="w-4 h-4" />
          </Button>
        </form>

        {/* Collaborators list */}
        <div className="space-y-2 mb-5">
          {/* Owner row */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold">
                {user.full_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{user.full_name || user.email}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-200 rounded-lg">Owner</span>
          </div>

          {collaborators.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                  {c.collaborator_email[0].toUpperCase()}
                </div>
                <p className="text-sm text-slate-700">{c.collaborator_email}</p>
              </div>
              {map.userId === user.id && (
                <button
                  onClick={() => remove.mutate(c.id)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm text-slate-600"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
          {copied ? "Link copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}