package com.example.demo;

import org.springframework.web.multipart.MultipartFile;
import java.util.List;

/**
 * [역할: 프론트엔드 요청 데이터 바구니]
 * - 리액트 UploadPage.tsx에서 FormData로 보내는 Key 이름과 1:1 매칭 필수
 * - [주의]: clothingImages는 최대 5장까지만 수용 가능하며, fullBodyImage는 1장 필수입니다.
 * - [데이터 표준화]: userInfo 내부 JSON Key를 'user_id', 'height_cm', 'gender'로 통일함.
 * - 추가 필드: 각 요청마다의 고유 식별자(taskId) 관리를 위해 확장성을 고려함.
 */
public class UploadRequestDto {
    
    // 리액트의 clothingImages (최대 5장까지만 수용 가능)
    private List<MultipartFile> clothingImages;
    // 리액트의 fullBodyImage (전신 사진 1장)
    private MultipartFile fullBodyImage;
    // 리액트의 userInfo (키, 몸무게, 성별 JSON 문자열)
    private String userInfo;
    // 추가: 작업 추적을 위한 taskId (필요 시 활용)
    private String taskId;

    // === 데이터 바인딩을 위한 Getter / Setter 세트 ===

    /** [기능: 의류 이미지 리스트 조회] */
    public List<MultipartFile> getClothingImages() { return clothingImages; }
    /** [기능: 의류 이미지 리스트 저장] */
    public void setClothingImages(List<MultipartFile> clothingImages) { this.clothingImages = clothingImages; }

    /** [기능: 전신 이미지 조회] */
    public MultipartFile getFullBodyImage() { return fullBodyImage; }
    /** [기능: 전신 이미지 저장] */
    public void setFullBodyImage(MultipartFile fullBodyImage) { this.fullBodyImage = fullBodyImage; }

    /** [기능: 사용자 정보(JSON) 조회] */
    public String getUserInfo() { return userInfo; }
    /** [기능: 사용자 정보(JSON) 저장] */
    public void setUserInfo(String userInfo) { this.userInfo = userInfo; }
    
    /** [기능: taskId 조회] */
    public String getTaskId() { return taskId; }
    /** [기능: taskId 저장] */
    public void setTaskId(String taskId) { this.taskId = taskId; }
}