import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import ClothingImageGrid  from '@/components/upload/ClothingImageGrid'
import FullBodyUploadZone from '@/components/upload/FullBodyUploadZone'
import BodyInfoForm       from '@/components/upload/BodyInfoForm'
import NoticeCard         from '@/components/common/NoticeCard'
import axios from 'axios' // 📡 axios를 직접 임포트합니다.

// [삭제] import { uploadImages } from '@/api/mockApi'

const GUIDE = [
  { emoji: '❤️', title: '취향 분석', desc: '업로드한 이미지의 스타일·색상을 AI가 분석합니다.' },
  { emoji: '👤', title: '체형 분석', desc: '전신 사진과 신체 정보로 BMI와 체형을 분석합니다.' },
  { emoji: '🎯', title: '정확한 분석', desc: '취향과 체형을 종합해 최적 의류를 추천합니다.' },
]

export default function UploadPage() {
  const navigate = useNavigate()
  const { clothingPreviews, fullBodyPreview, userInfo, userInfoErrors,
          setUserInfoError, clearUserInfoErrors, setTaskId,
          showGlobalLoading, hideGlobalLoading, addToast, isUploadReady } = useAppStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    clearUserInfoErrors()
    if (clothingPreviews.length === 0) { addToast('error', '의류 이미지를 1장 이상 업로드해 주세요.'); return }
    if (!fullBodyPreview)              { addToast('error', '전신 사진을 업로드해 주세요.'); return }
    if (!userInfo.height)              { setUserInfoError('height', '키를 입력해 주세요.'); return }
    if (!userInfo.weight)              { setUserInfoError('weight', '몸무게를 입력해 주세요.'); return }

    setIsSubmitting(true)
    showGlobalLoading('서버에 데이터를 전송 중입니다...')
    
    try {
      const fd = new FormData()
      clothingPreviews.forEach((p) => fd.append('clothingImages', p.file))
      fd.append('fullBodyImage', fullBodyPreview.file)
      fd.append('userInfo', JSON.stringify(userInfo))

      // 📡 실제 자바 백엔드로 통신 (타임아웃을 120초로 대폭 연장)
      const response = await axios.post('http://localhost:8080/api/recommendations/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 
      })

      // 백엔드 응답에서 taskId를 추출하여 로딩 페이지로 이동
      const taskId = response.data.taskId || `task_${Date.now()}`
      setTaskId(taskId)
      navigate(`/loading/${taskId}`)
      
    } catch (err: any) {
      console.error(err)
      addToast('error', '업로드에 실패했습니다. 자바 백엔드(8080) 서버를 확인하세요.')
    } finally {
      setIsSubmitting(false)
      hideGlobalLoading()
    }
  }

  const ready = isUploadReady()

  // ... (이하 JSX 구조는 동일) ...