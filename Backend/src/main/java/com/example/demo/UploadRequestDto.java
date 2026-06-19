package com.example.demo;

import org.springframework.web.multipart.MultipartFile;
import java.util.List;

/**
 * [역할: 프론트엔드 요청 데이터 바구니]
 * - 리액트 UploadPage.tsx에서 FormData로 보내는 Key 이름과 1:1 매칭 필수
 */
public class UploadRequestDto {
    
    private List<MultipartFile> clothingImages; // 리액트의 clothingImages (최대 5장)
    private MultipartFile fullBodyImage;        // 리액트의 fullBodyImage (전신 사진 1장)
    private String userInfo;                    // 리액트의 userInfo (키, 몸무게, 성별 JSON 문자열)

    // === 데이터 바인딩을 위한 Getter / Setter 세트 ===

    public List<MultipartFile> getClothingImages() { 
        return clothingImages; 
    }
    
    public void setClothingImages(List<MultipartFile> clothingImages) { 
        this.clothingImages = clothingImages; 
    }

    public MultipartFile getFullBodyImage() { 
        return fullBodyImage; 
    }
    
    public void setFullBodyImage(MultipartFile fullBodyImage) { 
        this.fullBodyImage = fullBodyImage; 
    }

    public String getUserInfo() { 
        return userInfo; 
    }
    
    public void setUserInfo(String userInfo) { 
        this.userInfo = userInfo; 
    }
}