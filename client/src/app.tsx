import React, { useState, useCallback, useRef } from 'react'
import axios from 'axios'

const apiBase = (import.meta as any).env.VITE_API_BASE || ''

interface AvailableFormats {
  input_format: string
  available_converters: string[]
  output_formats: string[]
}

export const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [availableFormats, setAvailableFormats] = useState<AvailableFormats | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [converting, setConverting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [dragActive, setDragActive] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const fetchAvailableFormats = async (file: File) => {
    const extension = getFileExtension(file.name)
    try {
      const response = await axios.get(`${apiBase}/api/format/available-formats/${extension}`)
      setAvailableFormats(response.data)
      setError('')
    } catch (err: any) {
      setError(`Формат ${extension} не поддерживается для конвертации`)
      setAvailableFormats(null)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      setFile(droppedFile)
      fetchAvailableFormats(droppedFile)
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      fetchAvailableFormats(selectedFile)
    }
  }

  const convertFile = async (outputFormat: string) => {
    if (!file) return
    
    setConverting(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('format', outputFormat)
      const url = `${apiBase}/api/image/convert`
      const response = await axios.post(url, form, { responseType: 'blob' })

      const contentDisposition = response.headers['content-disposition']
      const suggestedName = contentDisposition?.match(/filename="(.+?)"/i)?.[1] || `converted.${outputFormat}`

      const blobUrl = window.URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = suggestedName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (err: any) {
      setError(err?.message || 'Ошибка конвертации')
    } finally {
      setConverting(false)
    }
  }

  const resetFile = () => {
    setFile(null)
    setAvailableFormats(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div style={{ 
      maxWidth: 800, 
      margin: '0 auto', 
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '40px',
          color: '#333',
          fontSize: '2.5rem',
          fontWeight: '700'
        }}>
          Конвертер файлов
        </h1>

        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `3px dashed ${dragActive ? '#667eea' : '#ddd'}`,
              borderRadius: '15px',
              padding: '60px 20px',
              textAlign: 'center',
              background: dragActive ? '#f8f9ff' : '#fafafa',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📁</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
              {dragActive ? 'Отпустите файл здесь' : 'Перетащите файл сюда'}
            </h3>
            <p style={{ color: '#666', margin: '0 0 20px 0' }}>
              или нажмите для выбора файла
            </p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInput}
              style={{ display: 'none' }}
              accept="image/*"
            />
          </div>
        ) : (
          <div>
            <div style={{
              background: '#f8f9ff',
              borderRadius: '15px',
              padding: '20px',
              marginBottom: '30px',
              border: '2px solid #e1e5f2'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>Выбранный файл:</h3>
                  <p style={{ margin: '0', color: '#666' }}>{file.name}</p>
                </div>
                <button
                  onClick={resetFile}
                  style={{
                    background: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✕ Удалить
                </button>
              </div>
            </div>

            {availableFormats && (
              <div>
                <h3 style={{ marginBottom: '20px', color: '#333' }}>
                  Выберите формат для конвертации:
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '15px',
                  marginBottom: '30px'
                }}>
                  {availableFormats.output_formats.map((format) => (
                    <button
                      key={format}
                      onClick={() => convertFile(format)}
                      disabled={converting}
                      style={{
                        background: converting ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '15px 20px',
                        cursor: converting ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                      }}
                    >
                      {converting ? '⏳' : '→'} {format}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{
            background: '#ffe6e6',
            color: '#d63031',
            padding: '15px',
            borderRadius: '10px',
            marginTop: '20px',
            border: '1px solid #fab1a0'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}


