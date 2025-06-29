/**
 * Rich text editor component using React Quill
 * Provides formatting options for questions and answers
 */

import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'blockquote', 'code-block',
  'link'
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Start typing...",
  className = "",
  readOnly = false
}) => {
  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          backgroundColor: 'rgb(30 41 59)', // slate-800
          color: 'white',
          borderRadius: '0.5rem',
        }}
      />
      <style jsx global>{`
        .ql-toolbar {
          background-color: rgb(51 65 85) !important; /* slate-700 */
          border-color: rgb(71 85 105) !important; /* slate-600 */
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
        }
        
        .ql-container {
          background-color: rgb(30 41 59) !important; /* slate-800 */
          border-color: rgb(71 85 105) !important; /* slate-600 */
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          color: white !important;
        }
        
        .ql-editor {
          color: white !important;
          min-height: 120px;
        }
        
        .ql-editor.ql-blank::before {
          color: rgb(148 163 184) !important; /* slate-400 */
        }
        
        .ql-toolbar .ql-stroke {
          stroke: rgb(148 163 184) !important; /* slate-400 */
        }
        
        .ql-toolbar .ql-fill {
          fill: rgb(148 163 184) !important; /* slate-400 */
        }
        
        .ql-toolbar button:hover .ql-stroke {
          stroke: white !important;
        }
        
        .ql-toolbar button:hover .ql-fill {
          fill: white !important;
        }
        
        .ql-toolbar button.ql-active .ql-stroke {
          stroke: rgb(52 211 153) !important; /* emerald-400 */
        }
        
        .ql-toolbar button.ql-active .ql-fill {
          fill: rgb(52 211 153) !important; /* emerald-400 */
        }
        
        .ql-editor h1, .ql-editor h2, .ql-editor h3 {
          color: white !important;
        }
        
        .ql-editor blockquote {
          border-left: 4px solid rgb(52 211 153); /* emerald-400 */
          background-color: rgb(15 23 42); /* slate-900 */
          color: rgb(203 213 225); /* slate-300 */
        }
        
        .ql-editor code {
          background-color: rgb(15 23 42); /* slate-900 */
          color: rgb(52 211 153); /* emerald-400 */
        }
        
        .ql-editor pre {
          background-color: rgb(15 23 42); /* slate-900 */
          color: rgb(203 213 225); /* slate-300 */
        }
        
        .ql-editor a {
          color: rgb(52 211 153); /* emerald-400 */
        }
      `}</style>
    </div>
  );
};