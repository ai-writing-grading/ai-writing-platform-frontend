import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getToken } from "../lib/api";

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const [isLoggedIn] = useState(() => !!getToken());

  return (
    <div style={{
      minHeight: "calc(100vh - 64px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "4rem 2rem",
      fontFamily: "system-ui, -apple-system, sans-serif",
      backgroundColor: "#f8fafc",
      textAlign: "center"
    }}>
      
      {/* Hero Section */}
      <h1 style={{ 
        fontSize: "3.5rem", 
        fontWeight: "800", 
        color: "#111827", 
        margin: "0 0 1.5rem 0",
        lineHeight: "1.2"
      }}>
        Elevate Your Writing<br/>
        <span style={{ color: "#4f46e5" }}>Powered by AI</span>
      </h1>
      
      <p style={{ 
        fontSize: "1.25rem", 
        color: "#4b5563", 
        maxWidth: "600px", 
        margin: "0 auto 3rem auto", 
        lineHeight: "1.6" 
      }}>
        The intelligent writing platform built for learners. Get instant AI grading, structural analysis, and advanced phrase refinement for your essays.
      </p>

      {/* CTA Buttons */}
      <div style={{ 
        display: "flex", 
        gap: "1rem", 
        justifyContent: "center",
        flexWrap: "wrap"
      }}>
        {isLoggedIn ? (
          <Link to="/dashboard" style={{
            background: "#4f46e5", 
            color: "white", 
            padding: "0.875rem 2.5rem", 
            borderRadius: "0.5rem", 
            textDecoration: "none", 
            fontWeight: "600", 
            fontSize: "1.125rem",
            boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)",
            transition: "all 0.2s"
          }}>
            Go to Dashboard →
          </Link>
        ) : (
          <>
            <Link to="/login" style={{
              background: "#4f46e5", 
              color: "white", 
              padding: "0.875rem 2.5rem", 
              borderRadius: "0.5rem", 
              textDecoration: "none", 
              fontWeight: "600", 
              fontSize: "1.125rem",
              boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)",
              transition: "all 0.2s"
            }}>
              Start for Free
            </Link>
            <Link to="/login" style={{
              background: "#e0e7ff", 
              color: "#4338ca", 
              padding: "0.875rem 2.5rem", 
              borderRadius: "0.5rem", 
              textDecoration: "none", 
              fontWeight: "600", 
              fontSize: "1.125rem",
              transition: "all 0.2s"
            }}>
              Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}